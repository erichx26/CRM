-- AlterTable
ALTER TABLE `property` ADD COLUMN `baths` DOUBLE NULL,
    ADD COLUMN `beds` INTEGER NULL,
    ADD COLUMN `lotSize` INTEGER NULL,
    ADD COLUMN `mlsNumber` VARCHAR(191) NULL,
    ADD COLUMN `price` INTEGER NULL,
    ADD COLUMN `propertyType` VARCHAR(191) NULL,
    ADD COLUMN `source` VARCHAR(191) NULL,
    ADD COLUMN `squareFeet` INTEGER NULL,
    ADD COLUMN `yearBuilt` INTEGER NULL;

-- CreateTable
CREATE TABLE `Photo` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Photo` ADD CONSTRAINT `Photo_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
