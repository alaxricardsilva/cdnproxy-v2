// @ts-nocheck

import { logger } from '~/utils/logger'

import { defineEventHandler, createError, getHeader } from 'h3'

import { requireAdminAuth } from '../../../utils/hybrid-auth'



export default defineEventHandler(async (event) => {

  try {

    // Verificar se há token de autenticação antes de processar

    const authHeader = getHeader(event, 'authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {

      // Retornar erro 401 em vez de deixar o Nuxt.js servir a página

      throw createError({

        statusCode: 401,

        statusMessage: 'Token de autenticação necessário',

        data: {

          success: false,

          error: 'Token de autenticação necessário'

        }

      })

    }

    

    // Authenticate admin

    const { user, userProfile } = await requireAdminAuth(event)

    

    // Retornar dados do dashboard do admin

    return {

      success: true,

      data: {

        user: {

          id: userProfile.id,

          email: userProfile.email,

          name: userProfile.name,

          role: userProfile.role

        },

        stats: {

          // Adicionar estatísticas relevantes para o admin

          totalDomains: 0,

          activeDomains: 0,

          expiredDomains: 0

        }

      }

    }

  } catch (error: any) {

    // Garantir que erros sejam retornados como JSON

    event.node.res.setHeader('Content-Type', 'application/json')

    

    if (error.statusCode) {

      throw error

    }

    

    throw createError({

      statusCode: 500,

      statusMessage: 'Erro interno do servidor',

      data: {

        success: false,

        error: 'Erro interno do servidor'

      }

    })

  }

})