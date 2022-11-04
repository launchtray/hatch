// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- autogen file may not exist
import {
  Scimv2BulkApiDelegate,
  Scimv2GroupsApiDelegate,
  Scimv2MeApiDelegate,
  Scimv2ResourceTypeApiDelegate,
  Scimv2ServiceProviderConfigApiDelegate,
  Scimv2UsersApiDelegate,
} from './autogen';

export * from './autogen/index';

export type ScimV2Delegate =
  & Scimv2BulkApiDelegate
  & Scimv2GroupsApiDelegate
  & Scimv2MeApiDelegate
  & Scimv2ResourceTypeApiDelegate
  & Scimv2ServiceProviderConfigApiDelegate
  & Scimv2UsersApiDelegate;