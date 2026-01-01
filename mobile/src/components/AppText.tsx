import React from 'react';
import { Text, TextProps } from 'react-native';

// #region agent log
fetch('http://127.0.0.1:7242/ingest/16e3335f-6715-4f8a-beae-87df786dbc1e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AppText.tsx:4',message:'AppText module loading',data:{textType:typeof Text,textConstructor:Text?.constructor?.name,isFunction:typeof Text === 'function',isClass:typeof Text === 'function' && Text.prototype},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion
export const AppText = ({ style, ...props }: TextProps) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/16e3335f-6715-4f8a-beae-87df786dbc1e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AppText.tsx:7',message:'AppText render entry',data:{hasStyle:!!style,propsKeys:Object.keys(props)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  return <Text allowFontScaling={false} style={style} {...props} />;
};

