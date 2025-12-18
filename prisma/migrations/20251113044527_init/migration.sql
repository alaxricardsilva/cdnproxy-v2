-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralConfig" (
    "id" SERIAL NOT NULL,
    "configKey" TEXT NOT NULL,
    "configVal" TEXT NOT NULL,

    CONSTRAINT "GeneralConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperadminProfile" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "SuperadminProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PixTransaction" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "PixTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessLog" (
    "id" SERIAL NOT NULL,
    "domain_id" INTEGER,
    "path" TEXT,
    "method" TEXT,
    "status_code" INTEGER,
    "client_ip" TEXT,
    "user_agent" TEXT,
    "device_type" TEXT,
    "country" TEXT,
    "city" TEXT,
    "isp" TEXT,
    "response_time" INTEGER,
    "bytes_transferred" INTEGER,
    "cache_status" TEXT,
    "episode_info" JSONB,
    "session_id" TEXT,
    "change_type" TEXT,
    "episode_changed" BOOLEAN,
    "content_id" TEXT,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeolocationCache" (
    "id" SERIAL NOT NULL,
    "ip" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "isp" TEXT,
    "deviceInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeolocationCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyTraffic" (
    "id" SERIAL NOT NULL,
    "month" TEXT NOT NULL,
    "trafficMB" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyTraffic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardData" (
    "id" SERIAL NOT NULL,
    "metric" TEXT,
    "value" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MercadopagoTransaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "amount" DOUBLE PRECISION,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MercadopagoTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamingProxy" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamingProxy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeonAuthUserSync" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "raw_json" JSONB,

    CONSTRAINT "NeonAuthUserSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_key_key" ON "Configuration"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_name_key" ON "Domain"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralConfig_configKey_key" ON "GeneralConfig"("configKey");

-- CreateIndex
CREATE UNIQUE INDEX "SuperadminProfile_email_key" ON "SuperadminProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GeolocationCache_ip_key" ON "GeolocationCache"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "NeonAuthUserSync_email_key" ON "NeonAuthUserSync"("email");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PixTransaction" ADD CONSTRAINT "PixTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
