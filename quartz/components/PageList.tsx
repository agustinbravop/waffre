import { FullSlug, resolveRelative } from "../util/path";
import { QuartzPluginData } from "../plugins/vfile";
import { Date, getDate } from "./Date";
import { QuartzComponent, QuartzComponentProps } from "./types";
import { GlobalConfiguration } from "../cfg";

const FILTERED_PREFIXES = ["Los ", "Las ", "El ", "La "];

/**
 * Retorna el string dado pero sin cualquiera de los prefijos listados.
 * Solo elimina el primer prefijo que encuentra. Ej: Dado "Los la" devuelve "la".
 * Ejemplo: `filterPrefixes("Los Procesos")` retorna "Procesos".
 */
function filterPrefixes(str: string) {
  for (const prefix of FILTERED_PREFIXES) {
    if (str.startsWith(prefix)) {
      return str.slice(prefix.length);
    }
  }
  return str;
}

/** MOD: Ordenar por fecha tiene sentido en un blog, no en WAFRRe. */
function byAlphabetical(): (
  f1: QuartzPluginData,
  f2: QuartzPluginData,
) => number {
  return (f1, f2) => {
    // sort lexographically by title
    const f1Title = f1.frontmatter?.title.toLowerCase() ?? "";
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? "";
    return filterPrefixes(f1Title).localeCompare(filterPrefixes(f2Title));
  };
}

export function byDateAndAlphabetical(
  cfg: GlobalConfiguration,
): (f1: QuartzPluginData, f2: QuartzPluginData) => number {
  return (f1, f2) => {
    if (f1.dates && f2.dates) {
      // sort descending
      return getDate(cfg, f2)!.getTime() - getDate(cfg, f1)!.getTime();
    } else if (f1.dates && !f2.dates) {
      // prioritize files with dates
      return -1;
    } else if (!f1.dates && f2.dates) {
      return 1;
    }

    // otherwise, sort lexographically by title
    const f1Title = f1.frontmatter?.title.toLowerCase() ?? "";
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? "";
    return f1Title.localeCompare(f2Title);
  };
}

type Props = {
  limit?: number;
} & QuartzComponentProps;

export const PageList: QuartzComponent = ({
  cfg,
  fileData,
  allFiles,
  limit,
}: Props) => {
  // MOD: en WAFRRe ordenar por fecha de modificación no es útil. Se ordena solo alfabéticamente.
  let list = allFiles.sort(byAlphabetical());
  if (limit) {
    list = list.slice(0, limit);
  }

  return (
    <ul class="section-ul">
      {list.map((page) => {
        const title = page.frontmatter?.title;
        const tags = page.frontmatter?.tags ?? [];

        return (
          <li class="section-li">
            <div class="section">
              {page.dates && (
                <p class="meta">
                  <Date date={getDate(cfg, page)!} locale={cfg.locale} />
                </p>
              )}
              <div class="desc">
                <h3>
                  <a
                    href={resolveRelative(fileData.slug!, page.slug!)}
                    class="internal"
                  >
                    {title}
                  </a>
                </h3>
              </div>
              <ul class="tags">
                {tags.map((tag) => (
                  <li>
                    <a
                      class="internal tag-link"
                      href={resolveRelative(
                        fileData.slug!,
                        `tags/${tag}` as FullSlug,
                      )}
                    >
                      #{tag}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

PageList.css = `
.section h3 {
  margin: 0;
}

.section > .tags {
  margin: 0;
}
`;
