import { defineEventHandler } from 'h3'
import { requireVpnUser } from '../../utils/auth'
import { privateResponse } from '../../utils/api-error'

export default defineEventHandler(event => privateResponse(event, () => requireVpnUser(event)))
