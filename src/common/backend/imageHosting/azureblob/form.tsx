import React from 'react';
import { FormComponentProps } from 'antd/lib/form';
import { Form, Input } from 'antd';

interface Props extends FormComponentProps {
  info: {
    endpoint: string;
    container: string;
    sasStr: string;
  };
}

export default ({ form: { getFieldDecorator }, info }: Props) => {
  const initInfo: Partial<Props['info']> = info || {};
  return (
    <div>
      <Form.Item label="Endpoint">
        {
          getFieldDecorator('endpoint', {
            initialValue: initInfo.endpoint,
            rules: [
              {
                required: true,
              },
            ],
          })(<Input placeholder="https://xxx.blob.core.windows.net"></Input>)
        }
      </Form.Item>
      <Form.Item label="Container">
        {
          getFieldDecorator('container', {
            initialValue: initInfo.container,
            rules: [
              {
                required: true,
              },
            ],
          })(<Input placeholder="container_name"></Input>)
        }
      </Form.Item>
      <Form.Item label="SAS String">
        {
          getFieldDecorator('sasStr', {
            initialValue: initInfo.sasStr,
            rules: [
              {
                required: true,
              },
            ],
          })(<Input placeholder="sv=xxxxxxyyyyyy"></Input>)
        }
      </Form.Item>
    </div>
  );
};
