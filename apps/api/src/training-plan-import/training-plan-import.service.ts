import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PDFParse } from 'pdf-parse';
import { PrismaService } from '../prisma/prisma.service';

export interface ParsedTrainingExercise {
  name: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  restSeconds: number | null;
  notes: string | null;
}

export interface ParsedTrainingSection {
  category: string;
  exercises: ParsedTrainingExercise[];
}

export interface ParsedTrainingDay {
  name: string;
  sections: ParsedTrainingSection[];
}

export interface ParsedTrainingPlan {
  days: ParsedTrainingDay[];
}

const TRAINING_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name des Trainingstags, z.B. "Tag 1 - Push"',
          },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description:
                    'Kategorie des Abschnitts. Bevorzugt eines von: push, pull, beine, oberkörper, unterkörper - falls keins davon passt, ein kurzer passender freier Begriff.',
                },
                exercises: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      sets: { type: ['integer', 'null'] },
                      reps: { type: ['integer', 'null'] },
                      weight: {
                        type: ['number', 'null'],
                        description: 'Gewicht in kg, falls im Dokument angegeben',
                      },
                      restSeconds: {
                        type: ['integer', 'null'],
                        description: 'Pausenzeit in Sekunden, falls im Dokument angegeben',
                      },
                      notes: { type: ['string', 'null'] },
                    },
                    required: ['name', 'sets', 'reps', 'weight', 'restSeconds', 'notes'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['category', 'exercises'],
              additionalProperties: false,
            },
          },
        },
        required: ['name', 'sections'],
        additionalProperties: false,
      },
    },
  },
  required: ['days'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT =
  'Du extrahierst Trainingspläne aus hochgeladenem Text (meist aus einem PDF) in eine strukturierte Form. ' +
  'Ein Trainingsplan besteht aus Trainingstagen, jeder Tag aus Abschnitten (z.B. Push/Pull/Beine), ' +
  'jeder Abschnitt aus Übungen. Erkenne Sätze, Wiederholungen, Gewicht und Pausenzeit, falls angegeben - ' +
  'lasse Felder auf null, wenn sie im Dokument nicht genannt sind. Erfinde keine Werte.';

@Injectable()
export class TrainingPlanImportService {
  private client: Anthropic | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private assertConfigured(): Anthropic {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new InternalServerErrorException(
        'KI-gestützter Plan-Import ist nicht konfiguriert (ANTHROPIC_API_KEY fehlt)',
      );
    }
    if (!this.client) {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  private async assertCustomerBelongsToTenant(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Kunde nicht gefunden');
    }
  }

  private async extractText(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      const text = result.text?.trim();
      if (!text) {
        throw new BadRequestException('Aus der PDF-Datei konnte kein Text extrahiert werden');
      }
      return text;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('PDF-Datei konnte nicht gelesen werden');
    } finally {
      await parser.destroy();
    }
  }

  private async parseWithClaude(text: string): Promise<ParsedTrainingPlan> {
    const client = this.assertConfigured();
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      output_config: {
        format: { type: 'json_schema', schema: TRAINING_PLAN_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: `Extrahiere den Trainingsplan aus folgendem Text:\n\n${text}`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      throw new BadRequestException(
        'Die KI konnte diesen Trainingsplan nicht verarbeiten - bitte manuell eintragen',
      );
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new InternalServerErrorException('Unerwartete Antwort beim Plan-Import');
    }

    try {
      return JSON.parse(textBlock.text) as ParsedTrainingPlan;
    } catch {
      throw new InternalServerErrorException('Antwort der KI konnte nicht gelesen werden');
    }
  }

  async parse(tenantId: string, customerId: string, file: { buffer: Buffer }): Promise<ParsedTrainingPlan> {
    await this.assertCustomerBelongsToTenant(tenantId, customerId);
    const text = await this.extractText(file.buffer);
    return this.parseWithClaude(text);
  }
}
