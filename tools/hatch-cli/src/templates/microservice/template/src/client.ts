/* eslint-disable -- import order is important in order for the SwaggerUI to use __webpack_public_path__ */
const staticAssetsBaseURL = (window as any).__STATIC_ASSETS_BASE_URL__;
if (staticAssetsBaseURL !== '/') {
  __webpack_public_path__ = staticAssetsBaseURL;
}
// @ts-ignore
import SwaggerUI from 'swagger-ui';
import 'swagger-ui/dist/swagger-ui.css';

SwaggerUI({dom_id: '#root', url: '/api.json'});
