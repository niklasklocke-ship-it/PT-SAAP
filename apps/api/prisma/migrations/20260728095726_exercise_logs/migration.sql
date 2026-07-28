-- CreateTable
CREATE TABLE "exercise_logs" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "weight" DECIMAL(6,2),
    "sets" INTEGER,
    "reps" INTEGER,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercise_logs_customerId_exerciseName_idx" ON "exercise_logs"("customerId", "exerciseName");

-- AddForeignKey
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
