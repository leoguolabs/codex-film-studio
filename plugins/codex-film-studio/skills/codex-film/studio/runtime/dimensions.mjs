// Same integer ratio contract as build.py: nearest even height, ties upward.
export function outputDimensions(sourceWidth, sourceHeight, width) {
  if (![sourceWidth,sourceHeight,width].every(x=>Number.isSafeInteger(x)&&x>0))
    throw Error('Output and source dimensions must be positive safe integers');
  const height=Number(2n*((BigInt(width)*BigInt(sourceHeight)+BigInt(sourceWidth))/(2n*BigInt(sourceWidth))));
  if(width%2||height<2||!Number.isSafeInteger(height))throw Error('Output width must be even and produce a valid height');
  return [width,height];
}
