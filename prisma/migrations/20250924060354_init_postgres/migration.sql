-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('ML', 'SPREAD', 'TOTAL');

-- CreateEnum
CREATE TYPE "MarketSelection" AS ENUM ('HOME', 'AWAY', 'OVER', 'UNDER');

-- CreateEnum
CREATE TYPE "PickSelection" AS ENUM ('HOME', 'AWAY', 'OVER', 'UNDER');

-- CreateEnum
CREATE TYPE "ResultOutcome" AS ENUM ('WIN', 'LOSE', 'PUSH');

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "league" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL PRIMARY KEY,
    "league" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "homeTeamId" INTEGER NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    CONSTRAINT "Game_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Game_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Market" (
    "id" SERIAL PRIMARY KEY,
    "gameId" INTEGER NOT NULL,
    "type" "MarketType" NOT NULL,
    "selection" "MarketSelection" NOT NULL,
    "line" DOUBLE PRECISION,
    CONSTRAINT "Market_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Odds" (
    "id" SERIAL PRIMARY KEY,
    "marketId" INTEGER NOT NULL,
    "bookmaker" TEXT NOT NULL,
    "oddsDecimal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Odds_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModelProb" (
    "id" SERIAL PRIMARY KEY,
    "marketId" INTEGER NOT NULL,
    "pModel" DOUBLE PRECISION NOT NULL,
    "modelTag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModelProb_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pick" (
    "id" SERIAL PRIMARY KEY,
    "marketId" INTEGER NOT NULL,
    "selection" "PickSelection" NOT NULL,
    "stakeUnits" DOUBLE PRECISION NOT NULL,
    "kellyFactor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pick_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Result" (
    "id" SERIAL PRIMARY KEY,
    "marketId" INTEGER NOT NULL,
    "outcome" "ResultOutcome" NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Result_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetricDaily" (
    "id" SERIAL PRIMARY KEY,
    "date" TIMESTAMP(3) NOT NULL,
    "kpi" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "UploadLog" (
    "id" SERIAL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Result_marketId_key" ON "Result"("marketId");

-- CreateIndex
CREATE UNIQUE INDEX "MetricDaily_date_key" ON "MetricDaily"("date");
