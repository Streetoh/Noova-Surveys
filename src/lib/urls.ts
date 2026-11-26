export function buildPublicSurveyUrl(
  surveyId: string,
  origin: string = window.location.origin,
  pathname: string = window.location.pathname
): string {
  const cleanPath = pathname.endsWith('/') ? pathname : pathname.replace(/\/[^/]*\.html$/i, '/');
  const normalizedPath = cleanPath.endsWith('/') ? cleanPath : `${cleanPath}/`;
  return `${origin}${normalizedPath}#/s/${encodeURIComponent(surveyId)}`;
}
