import { PartialType } from '@nestjs/mapped-types';
import { CreateTrainingExerciseDto } from './create-training-exercise.dto';

// sectionId ist beim Update nicht änderbar (Übung bleibt in ihrem Abschnitt) -
// PartialType von CreateTrainingExerciseDto reicht trotzdem, das Feld wird
// im Service beim Update einfach ignoriert.
export class UpdateTrainingExerciseDto extends PartialType(CreateTrainingExerciseDto) {}
