declare module 'react-katex' {
  import * as React from 'react';

  export interface KatexProps {
    math?: string;
    children?: React.ReactNode;
    renderError?: (error: Error | TypeError) => React.ReactNode;
    errorColor?: string;
    as?: string | React.ComponentType<any>;
    strict?: boolean | string | ((errorCode: string, errorMsg: string, token?: any) => string | boolean);
  }

  export class InlineMath extends React.Component<KatexProps> {}
  export class BlockMath extends React.Component<KatexProps> {}
}
