import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StreamingProxyModule } from './streaming-proxy/streaming-proxy.module';
import { LogsModule } from './logs/logs.module';
import { GeolocationModule } from './geolocation/geolocation.module';
import { StatusModule } from './status/status.module';
import { RequestRoutingMiddleware } from './common/request-routing.middleware';
import { SuperadminProfileModule } from './superadmin-profile/superadmin-profile.module';
import { DashboardDataModule } from './dashboard-data/dashboard-data.module';
import { AdminDomainsModule } from './admin-domains/admin-domains.module';
import { SuperadminAnalyticsModule } from './superadmin-analytics/superadmin-analytics.module';
import { SuperadminGeneralConfigModule } from './superadmin-general-config/superadmin-general-config.module';
import { PrismaService } from './common/prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PlansModule } from './plans/plans.module';
import { PaymentsModule } from './payments/payments.module';
import { PixTransactionsModule } from './pix-transactions/pix-transactions.module';
import { ConfigurationsModule } from './configurations/configurations.module';
import { MercadopagoModule } from './mercadopago/mercadopago.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StreamingProxyModule,
    LogsModule,
    GeolocationModule,
    StatusModule,
    SuperadminProfileModule,
    DashboardDataModule,
    AdminDomainsModule,
    SuperadminAnalyticsModule,
    SuperadminGeneralConfigModule,
    AuthModule, // Adiciona o módulo de autenticação JWT
    UsersModule,
    PlansModule,
    PaymentsModule,
    PixTransactionsModule,
    ConfigurationsModule,
    MercadopagoModule, // <-- Adiciona o módulo MercadoPago
  ],
  providers: [PrismaService],
  exports: [PrismaService], // Exporta o PrismaService para todos os módulos
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // consumer.apply(RequestRoutingMiddleware).forRoutes('streaming');
  }
}
// Exportação dos módulos para facilitar manutenção
export * from './users/users.module';
export * from './plans/plans.module';
export * from './payments/payments.module';
export * from './pix-transactions/pix-transactions.module';
export * from './configurations/configurations.module';
export * from './mercadopago/mercadopago.module';