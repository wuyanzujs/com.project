import { depponHttp } from '../../request/deppon'

import type {
  Contact,
  ContactAddressCheckRequest,
  ContactAnalysis,
  ContactAnalysis4,
  ContactAnalysis4Request,
  ContactListRequest,
  ContactListResponse,
  ContactQueryRequest,
  ContactQueryResponse,
  ContactTownItem,
  ContactTownListRequest
} from './types'

export const contactApi = {
  queryContact(data: ContactListRequest, timeout = 10000) {
    return depponHttp.post<ContactListResponse, ContactListRequest>(
      '/gwapi/userService/eco/user/contact/secure/queryContact',
      data,
      {
        loading: false,
        timeout
      }
    )
  },

  saveContact(contact: Contact, loading = true) {
    const isUpdate = !!contact.id
    const url = isUpdate
      ? '/gwapi/userService/eco/user/contact/secure/updateContact'
      : '/gwapi/userService/eco/user/contact/secure/insertContact'
    const data = isUpdate ? { ...contact, isUpdateCompany: 1 } : contact

    return depponHttp.post<Contact, Contact>(url, data, {
      loading
    })
  },

  deleteContacts(ids: string[]) {
    return depponHttp.post('/gwapi/userService/eco/user/contact/secure/deleteContact', {
      ids
    })
  },

  batchDeleteContact(deleteType: number) {
    return depponHttp.post<number, { deleteType: number }>(
      '/gwapi/userService/eco/user/contact/secure/batchDeleteContact',
      { deleteType }
    )
  },

  queryDefaultContact() {
    return depponHttp.post<Contact>(
      '/gwapi/userService/eco/user/contact/secure/queryDefaultContact',
      undefined,
      {
        login: false,
        loading: false
      }
    )
  },

  analyzeAddress(address: string, timeout = 10000) {
    return depponHttp.post<ContactAnalysis, { address: string }>(
      '/gwapi/onlineService/eco/online/addressAiResolutionApi/addressAiResolution',
      { address },
      {
        timeout,
        loading: true
      }
    )
  },

  analyzeAddress4(data: ContactAnalysis4Request, timeout = 10000) {
    return depponHttp.post<ContactAnalysis4, ContactAnalysis4Request>(
      '/gwapi/onlineService/eco/online/addressAiResolutionApi/addressCodingDirections',
      data,
      {
        timeout,
        loading: true
      }
    )
  },

  queryAddressHints(data: ContactQueryRequest) {
    return depponHttp.post<ContactQueryResponse, ContactQueryRequest>(
      '/gwapi/queryService/eco/query/addressImagine',
      data,
      {
        loading: false,
        timeout: 3000
      }
    )
  },

  queryTownList(data: ContactTownListRequest, loading = true) {
    return depponHttp.post<ContactTownItem[], ContactTownListRequest>(
      '/gwapi/queryService/eco/query/city/queryTownByCounty',
      data,
      {
        login: false,
        loading,
        timeout: 3000
      }
    )
  },

  queryContactCount() {
    return depponHttp.get<number>(
      '/gwapi/userService/eco/user/contact/secure/queryContactTotal',
      {
        login: false,
        loading: false,
        timeout: 3000
      }
    )
  },

  checkAddressDetail(data: ContactAddressCheckRequest) {
    return depponHttp.post(
      '/gwapi/userService/eco/user/contact/secure/checkAddressIsDetail',
      data,
      {
        timeout: 3000
      }
    )
  },

  recommendByLocation(data: { address: string; lat: number; lng: number }) {
    return depponHttp.post<
      Contact,
      { address: string; lat: number; lng: number }
    >(
      '/gwapi/userService/eco/user/contact/addressMinDistanceAnalysis',
      data,
      {
        login: false,
        loading: false,
        timeout: 3000
      }
    )
  }
}
