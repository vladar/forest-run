export function splitPath(path: string) {
  let result = [];
  let segment = "";
  const tryProcessSegment = (strSegment: string) => {
    if (!strSegment.length) {
      return;
    }
    const intSegment = parseInt(strSegment, 10);
    result.push(isNaN(intSegment) ? strSegment : intSegment);
  }

  for (const c of path) {
    if (".[]".indexOf(c) > -1) {
      tryProcessSegment(segment);
      segment = ""; 
    } else {
      segment += c;
    }
  }
  tryProcessSegment(segment);
  return result;
}
