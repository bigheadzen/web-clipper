import Form from './form';
import { ImageHostingServiceMeta } from '../interface';
import Service from './service';

export default (): ImageHostingServiceMeta => {
  return {
    name: 'Azure Blob',
    icon: 'azure',
    type: 'azureblob',
    service: Service,
    form: Form,
    permission: {
      origins: ['https://*.blob.core.windows.net/*'],
    },
  };
};
