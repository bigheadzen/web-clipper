import axios from 'axios';
import { UploadImageRequest, ImageHostingService } from '../interface';
import { Base64ImageToBlob } from '@/common/blob';
import { BlobServiceClient } from '@azure/storage-blob';
import SparkMD5 from 'spark-md5';

export interface AzureBlobImageHostingOption {
  endpoint: string;
  container: string;
  sasStr: string;
}

export default class AzureBlobImageHostingService implements ImageHostingService {
  private config: AzureBlobImageHostingOption;
  private id: string;

  constructor(config: AzureBlobImageHostingOption) {
    this.config = config;
    const endpoint = this.config.endpoint;
    if (endpoint.endsWith('/')) {
      this.config.endpoint = endpoint.substring(0, endpoint.length - 1);
      if (this.config.endpoint.endsWith('/')) {
        throw new Error(`Invalid endpiont URI: ${endpoint}`);
      }
    }
    this.id = `${this.config.endpoint}${this.config.container}`;
  }

  getId = () => {
    return this.id;
  };

  uploadImage = async ({ data }: UploadImageRequest) => {
    const pageUrl = await this.getPageUrl();
    console.log(`Upload image len: ${data.length}, page: ${pageUrl}`);
    const blob = Base64ImageToBlob(data);
    return this.uploadBlob(pageUrl, '', blob);
  };

  uploadImageUrl = async (url: string) => {
    const pageUrl = await this.getPageUrl();
    console.log(
      `Upload image url: ${url}, endpoint: ${this.config.endpoint}, container: ${this.config.container}, page: ${pageUrl}`
    );

    let blob: Blob;
    try {
      const res = await axios.get(url, { responseType: 'blob' });
      blob = res.data;
    } catch (_e) {
      let e: Error = _e;
      const proxyUrl = `https://fileproxy.junguo.fun/download?url=${encodeURIComponent(url)}`;
      console.log(`Failed to download ${url}, error: ${e.message}, try use proxy: ${proxyUrl}.`);
      const res = await axios.get(proxyUrl, { responseType: 'blob' });
      blob = res.data;
    }

    console.log(`Get image done. type: ${blob.type}, size: ${blob.size}`);

    if (blob.type === 'image/webp' || blob.type === 'application/octet-stream') {
      blob = blob.slice(0, blob.size, 'image/jpeg');
    }
    return this.uploadBlob(pageUrl, url, blob);
  };

  private uploadBlob = async (pageUrl: string, imageUrl: string, blob: Blob): Promise<string> => {
    const blobSvc = new BlobServiceClient(`${this.config.endpoint}/?${this.config.sasStr}`);
    const container = blobSvc.getContainerClient(this.config.container);

    //const blobSvc = new BlobServiceClient(
    //  'https://myimagesea.blob.core.windows.net/?sv=2019-10-10&si=clipper-edit&sr=c&sig=M%2FGUyphs7%2BLnjxlgRgnRplG5%2BCUQ2hQAoEZP8u%2Bve2I%3D'
    //);
    //const container = blobSvc.getContainerClient('clipper');

    const tempUrl = new URL(pageUrl);
    const host =
      tempUrl.hostname.length > 32 ? tempUrl.hostname.substring(0, 32) : tempUrl.hostname;
    let path = tempUrl.pathname.length > 32 ? tempUrl.pathname.substring(0, 32) : tempUrl.pathname;

    const re = /\//gi;
    path = path.replace(re, '_SEP_');

    const fileName = await this.getImageFileName(imageUrl, blob);
    const blobName = `${host}/${path}/${fileName}`;
    const blobNameUri = `${host}/${encodeURIComponent(path)}/${encodeURIComponent(fileName)}`;

    const client = container.getBlockBlobClient(blobName);
    console.log(`Will upload blob: ${blobName}`);
    const rsp = await client.upload(blob, blob.size, {
      blobHTTPHeaders: {
        blobContentType: blob.type,
      },
      metadata: {
        originalPage: pageUrl,
        originalImage: imageUrl,
      },
    });

    const resultUrl = `${this.config.endpoint}/${this.config.container}/${blobNameUri}`;
    console.log(
      `Upload block blob ${blobName} successfully. Url: ${resultUrl}, requestId: ${rsp.requestId}`
    );

    return resultUrl;
  };

  private getImageFileName = async (imageUrl: string, blob: Blob): Promise<string> => {
    const ext = this.getImageExt(blob);
    let name: string = '';
    if (imageUrl.length > 0) {
      const urlMd5 = SparkMD5.hash(imageUrl);
      const tempUrl = new URL(imageUrl);
      const elements = tempUrl.pathname.split('/');
      const last = elements[elements.length - 1];
      const pos = last.lastIndexOf('.');
      if (last.length > 0 && pos > 0 && pos < last.length - 1) {
        const imageFileName = last.substring(0, pos);
        const imageExt = last.substring(pos + 1);
        let extMatch = ext === imageExt;
        if (!extMatch && ext === 'jpg') {
          extMatch = imageExt === 'jpeg' || imageExt === 'jpg';
        }
        if (extMatch) {
          name = `${imageFileName}_${urlMd5}.${ext}`;
        } else {
          name = `${urlMd5}.${ext}`;
        }
      } else {
        name = `${urlMd5}.${ext}`;
      }
    } else {
      const blobMd5 = await this.calcBlobMd5(blob);
      name = `${blobMd5}.${ext}`;
    }
    return name;
  };
  private calcBlobMd5 = async (blob: Blob): Promise<string> => {
    return new Promise<string>(resolve => {
      let r = new FileReader();
      r.readAsArrayBuffer(blob);
      r.onloadend = function() {
        resolve(SparkMD5.ArrayBuffer.hash(<ArrayBuffer>r.result));
      };
    });
  };
  private getImageExt = (blob: Blob): string => {
    switch (blob.type) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/bmp':
        return 'bmp';
      case 'image/gif':
        return 'gif';
      case 'image/svg+xml':
        return 'svg';
      default:
        throw new Error(`Unsupport image type: ${blob.type}`);
    }
  };

  private getPageUrl = async (): Promise<string> => {
    return new Promise<string>(resolve => {
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true,
        },
        function(tabs) {
          resolve(tabs[0].url);
        }
      );
    });
  };
}
