-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Full',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Underwriting',
    "dealLead" TEXT,
    "priority" TEXT,
    "dealType" TEXT,
    "industry" TEXT DEFAULT 'IT Services',
    "subIndustry" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "jurisdiction" TEXT NOT NULL DEFAULT 'US',
    "driveFolderUrl" TEXT,
    "businessProfile" TEXT,
    "nextSteps" TEXT,
    "passReason" TEXT,
    "dateOfEntry" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revenueM" DOUBLE PRECISION,
    "ebitdaM" DOUBLE PRECISION,
    "sdeM" DOUBLE PRECISION,
    "evM" DOUBLE PRECISION,
    "valuationBasis" TEXT,
    "score" DOUBLE PRECISION,
    "keyDocuments" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "type" TEXT,
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "pages" INTEGER,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "documentId" TEXT,
    "agent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "tokens" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "error" TEXT,
    "rawOutput" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposedValue" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "documentId" TEXT,
    "field" TEXT NOT NULL,
    "value" TEXT,
    "citationLocator" TEXT,
    "snippet" TEXT,
    "confidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposedValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" TEXT NOT NULL,
    "docVersionId" TEXT NOT NULL,
    "locatorType" TEXT NOT NULL,
    "locatorValue" TEXT NOT NULL,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flag" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "label" TEXT,

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskItem" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "evidence" TEXT,
    "mitigant" TEXT,
    "owner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Open',

    CONSTRAINT "RiskItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreEntry" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "axis" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "rationale" TEXT,

    CONSTRAINT "ScoreEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoSection" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "model" TEXT,
    "promptVersion" TEXT,
    "body" TEXT,
    "data" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LboScenario" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assumptions" TEXT NOT NULL,
    "outputs" TEXT,
    "grids" TEXT,

    CONSTRAINT "LboScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Missing',

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossCheckEntry" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "figure" TEXT NOT NULL,
    "appearsAt" TEXT,
    "method" TEXT NOT NULL,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Unverified',
    "detail" TEXT,
    "resolution" TEXT,

    CONSTRAINT "CrossCheckEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortDataset" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerYearRevenue" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CustomerYearRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoldCoFacility" (
    "id" TEXT NOT NULL,
    "lender" TEXT NOT NULL,
    "commitment" DOUBLE PRECISION NOT NULL,
    "drawn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rateType" TEXT NOT NULL,
    "indexName" TEXT,
    "spreadBps" INTEGER,
    "amortization" TEXT,
    "maturity" TIMESTAMP(3),
    "covenants" TEXT,

    CONSTRAINT "HoldCoFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityDraw" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "dealId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityDraw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoldCoTest" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "inputs" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "headroom" DOUBLE PRECISION,
    "testedBy" TEXT,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HoldCoTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtifactItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "notes" TEXT,
    "externalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtifactItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtifactVersion" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtifactVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "DocumentVersion_sha256_idx" ON "DocumentVersion"("sha256");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MemoSection_dealId_page_version_key" ON "MemoSection"("dealId", "page", "version");

-- CreateIndex
CREATE UNIQUE INDEX "LboScenario_dealId_name_key" ON "LboScenario"("dealId", "name");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposedValue" ADD CONSTRAINT "ProposedValue_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposedValue" ADD CONSTRAINT "ProposedValue_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_docVersionId_fkey" FOREIGN KEY ("docVersionId") REFERENCES "DocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskItem" ADD CONSTRAINT "RiskItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEntry" ADD CONSTRAINT "ScoreEntry_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEntry" ADD CONSTRAINT "ScoreEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoSection" ADD CONSTRAINT "MemoSection_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LboScenario" ADD CONSTRAINT "LboScenario_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossCheckEntry" ADD CONSTRAINT "CrossCheckEntry_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortDataset" ADD CONSTRAINT "CohortDataset_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerYearRevenue" ADD CONSTRAINT "CustomerYearRevenue_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "CohortDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityDraw" ADD CONSTRAINT "FacilityDraw_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "HoldCoFacility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityDraw" ADD CONSTRAINT "FacilityDraw_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoldCoTest" ADD CONSTRAINT "HoldCoTest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactVersion" ADD CONSTRAINT "ArtifactVersion_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "ArtifactItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

