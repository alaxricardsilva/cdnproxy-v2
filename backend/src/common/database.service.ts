import { neon } from '@neondatabase/serverless';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService {
    private readonly sql;

    constructor(private configService: ConfigService) {
        const databaseUrl = this.configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
            throw new Error('DATABASE_URL não definida nas variáveis de ambiente');
        }
        this.sql = neon(databaseUrl);
    }

    async getData(query: string) {
        const data = await this.sql`${query}`;
        return data;
    }
}