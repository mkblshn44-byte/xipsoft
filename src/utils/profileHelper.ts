export const checkIsFoundTag = (profileTag: string, searchTag: string) => {
  const sTagLowerCase = searchTag.toLowerCase();
  const pTagLowerCase = profileTag.toLowerCase();

  const isExactMatch = pTagLowerCase === sTagLowerCase;
  if (isExactMatch) return true;

  const isWithJsOrDotJSMatch =
    pTagLowerCase === sTagLowerCase + "js" ||
    pTagLowerCase === sTagLowerCase + ".js";
  if (isWithJsOrDotJSMatch) return true;

  const isRemoveJsOrDotJsExtensionMatch =
    pTagLowerCase === sTagLowerCase.replace(/\.js$/, "") ||
    pTagLowerCase === sTagLowerCase.replace(/js$/, "");
  if (isRemoveJsOrDotJsExtensionMatch) return true;

  const isAddJsOrDotJsToProfileTagMatch =
    pTagLowerCase + "js" === sTagLowerCase ||
    pTagLowerCase + ".js" === sTagLowerCase;
  if (isAddJsOrDotJsToProfileTagMatch) return true;

  const isTrySwapDotJsAndJsExtMatch =
    pTagLowerCase === sTagLowerCase.replace(/\.js$/, "") + "js" ||
    pTagLowerCase === sTagLowerCase.replace(/js$/, "") + ".js";
  if (isTrySwapDotJsAndJsExtMatch) return true;

  return false;
};
