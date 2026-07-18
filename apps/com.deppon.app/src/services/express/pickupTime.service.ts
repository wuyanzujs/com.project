import { expressApi } from './express.api'
import { validateExpressContact } from './express.draft'
import { buildPickupTimeRequest } from './express.payload'
import { normalizeExpressPickupTimeResponse } from './pickupTime.options'
import {
  buildExpressPickupNightRequest,
  createExpressPickupNightCapability,
  getFreshExpressPickupNightCapability
} from './pickupTime.rules'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type { ExpressDraft, ExpressPickupTimeResponse } from './types'
import type { DepponResponse } from '../../request/deppon'

export async function queryExpressPickupTime(
  draft: ExpressDraft
): Promise<DepponResponse<ExpressPickupTimeResponse>> {
  const senderMessages = validateExpressContact(draft.sender, '寄件人')

  if (senderMessages.length) {
    return createFailure<ExpressPickupTimeResponse>(senderMessages[0])
  }

  let nightCapability = getFreshExpressPickupNightCapability(draft)

  if (!nightCapability) {
    try {
      const nightResponse = await expressApi.queryPickupNight(
        buildExpressPickupNightRequest(draft)
      )

      nightCapability = createExpressPickupNightCapability(
        draft,
        nightResponse.status ? nightResponse.result : null
      )
    } catch {
      nightCapability = createExpressPickupNightCapability(draft)
    }
  }

  const response = await expressApi.queryPickupTime(
    buildPickupTimeRequest(draft, nightCapability),
    false
  )

  if (!response.status || !response.result) {
    return response
  }

  return {
    ...response,
    result: normalizeExpressPickupTimeResponse(
      response.result,
      nightCapability
    )
  }
}
