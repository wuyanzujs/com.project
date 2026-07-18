import { depponHttp } from '../../request/deppon'

import type {
  OrderSceneCommentQueryRequest,
  OrderSceneCommentSubmitRequest,
  OrderSceneSurveyDefinitionRaw
} from './order.sceneSurvey.types'

export const ORDER_SCENE_SURVEY_API_ENDPOINTS = {
  query: '/gwapi/commentService/eco/comment/queryComment',
  definition: '/gwapi/commentService/eco/comment/queryCommentScene',
  submit: '/gwapi/commentService/eco/comment/insertComment'
} as const

export const orderSceneSurveyApi = {
  query(data: OrderSceneCommentQueryRequest) {
    return depponHttp.post<unknown, OrderSceneCommentQueryRequest>(
      ORDER_SCENE_SURVEY_API_ENDPOINTS.query,
      data,
      {
        loading: false,
        login: false,
        timeout: 3000
      }
    )
  },

  queryDefinition(sceneCode: string) {
    return depponHttp.post<
      OrderSceneSurveyDefinitionRaw,
      { sceneCode: string }
    >(
      ORDER_SCENE_SURVEY_API_ENDPOINTS.definition,
      { sceneCode },
      {
        loading: false,
        login: false,
        timeout: 3000
      }
    )
  },

  submit(data: OrderSceneCommentSubmitRequest) {
    return depponHttp.post<boolean, OrderSceneCommentSubmitRequest>(
      ORDER_SCENE_SURVEY_API_ENDPOINTS.submit,
      data,
      {
        login: false,
        timeout: 3000
      }
    )
  }
}
