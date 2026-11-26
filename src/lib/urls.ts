export function buildPublicSurveyUrl(
  surveyId: string,
  origin: string = window.location.origin,
  pathname: string = window.location.pathname
): string {
  const cleanPath = pathname.endsWith('/') ? pathname : pathname.replace(/\/[^/]*\.html$/i, '/');
  const normalizedPath = cleanPath.endsWith('/') ? cleanPath : `${cleanPath}/`;
  return `${origin}${normalizedPath}#/s/${encodeURIComponent(surveyId)}`;
}

export const VIBER_ESTONIAN_PROMPT =
  'Palun võta 3 minutit ja vasta lühikesele küsitlusele treeningute kohta:';

export function buildViberShareUrl(publicUrl: string): string {
  const message = `${VIBER_ESTONIAN_PROMPT} ${publicUrl}`;
  return `viber://forward?text=${encodeURIComponent(message)}`;
}
