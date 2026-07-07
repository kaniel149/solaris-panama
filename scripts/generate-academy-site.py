from pathlib import Path
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "sales" / "academy"
OUT = ROOT / "public" / "academy"
LANGS = {"es": "Español", "en": "English", "he": "עברית"}


def inline_markup(text: str) -> str:
    text = html.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    return text


def markdown_to_html(markdown: str) -> str:
    lines = markdown.splitlines()
    rendered: list[str] = []
    i = 0
    in_ul = False
    in_ol = False

    def close_lists() -> None:
        nonlocal in_ul, in_ol
        if in_ul:
            rendered.append("</ul>")
            in_ul = False
        if in_ol:
            rendered.append("</ol>")
            in_ol = False

    while i < len(lines):
        line = lines[i].rstrip()
        if not line.strip():
            close_lists()
            i += 1
            continue
        if line.strip() == "---":
            close_lists()
            rendered.append("<hr>")
            i += 1
            continue
        if (
            line.startswith("|")
            and i + 1 < len(lines)
            and lines[i + 1].startswith("|")
            and re.search(r"\|\s*-{3,}", lines[i + 1])
        ):
            close_lists()
            headers = [cell.strip() for cell in line.strip("|").split("|")]
            i += 2
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([cell.strip() for cell in lines[i].strip("|").split("|")])
                i += 1
            rendered.append(
                '<div class="table-wrap"><table><thead><tr>'
                + "".join(f"<th>{inline_markup(cell)}</th>" for cell in headers)
                + "</tr></thead><tbody>"
            )
            for row in rows:
                rendered.append("<tr>" + "".join(f"<td>{inline_markup(cell)}</td>" for cell in row) + "</tr>")
            rendered.append("</tbody></table></div>")
            continue
        heading = re.match(r"^(#{1,4})\s+(.*)", line)
        if heading:
            close_lists()
            level = len(heading.group(1))
            rendered.append(f"<h{level}>{inline_markup(heading.group(2))}</h{level}>")
            i += 1
            continue
        if line.startswith(">"):
            close_lists()
            rendered.append(f"<blockquote>{inline_markup(line.lstrip('> '))}</blockquote>")
            i += 1
            continue
        bullet = re.match(r"^\s*[-*]\s+(.*)", line)
        if bullet:
            if in_ol:
                rendered.append("</ol>")
                in_ol = False
            if not in_ul:
                rendered.append("<ul>")
                in_ul = True
            rendered.append(f"<li>{inline_markup(bullet.group(1))}</li>")
            i += 1
            continue
        numbered = re.match(r"^\s*\d+[.)]\s+(.*)", line)
        if numbered:
            if in_ul:
                rendered.append("</ul>")
                in_ul = False
            if not in_ol:
                rendered.append("<ol>")
                in_ol = True
            rendered.append(f"<li>{inline_markup(numbered.group(1))}</li>")
            i += 1
            continue
        close_lists()
        rendered.append(f"<p>{inline_markup(line)}</p>")
        i += 1
    close_lists()
    return "\n".join(rendered)


def title_of(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return path.stem.replace("-", " ").title()


def language_switch_links(current_lang: str, slug: str) -> str:
    links = []
    for lang, label in LANGS.items():
        target = OUT / lang / f"{slug}.html"
        href = f"/academy/{lang}/{slug}.html" if target.exists() else f"/academy/{lang}/README.html"
        active = ' class="active"' if lang == current_lang else ""
        links.append(f'<a{active} href="{href}">{label}</a>')
    return "".join(links)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    nav: dict[str, list[dict[str, str]]] = {lang: [] for lang in LANGS}
    module_files: list[tuple[str, Path]] = []
    for lang in LANGS:
        for path in sorted((SRC / lang).glob("*.md")):
            module_files.append((lang, path))
            nav[lang].append({"title": title_of(path), "slug": path.stem, "href": f"{lang}/{path.stem}.html"})

    css = """
:root{--bg:#071318;--panel:#0d2028;--card:#12303a;--text:#eef8f6;--muted:#a9c3be;--brand:#00c48c;--brand2:#ffc857;--line:rgba(255,255,255,.12)}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;background:linear-gradient(140deg,#061015,#0c2630 60%,#0c1d25);color:var(--text);line-height:1.65}a{color:var(--brand);text-decoration:none}a:hover{text-decoration:underline}.layout{display:grid;grid-template-columns:320px 1fr;min-height:100vh}.side{background:rgba(7,19,24,.92);border-right:1px solid var(--line);padding:24px;position:sticky;top:0;height:100vh;overflow:auto}.brand{font-weight:800;font-size:22px;margin-bottom:6px}.sub{color:var(--muted);font-size:14px;margin-bottom:22px}.lang{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px}.lang a{padding:7px 10px;border:1px solid var(--line);border-radius:999px;color:var(--text)}.lang a.active{background:var(--brand);color:#032016;border-color:var(--brand)}.nav a{display:block;padding:9px 10px;border-radius:10px;color:var(--muted);font-size:14px}.nav a.active,.nav a:hover{background:rgba(0,196,140,.12);color:var(--text);text-decoration:none}.main{padding:40px 6vw;max-width:1100px}.hero{border:1px solid var(--line);background:linear-gradient(135deg,rgba(0,196,140,.14),rgba(255,200,87,.08));border-radius:24px;padding:28px;margin-bottom:28px}.hero h1{margin:0 0 10px;font-size:clamp(32px,5vw,56px);line-height:1.05}.cta{display:inline-block;background:var(--brand);color:#032016;font-weight:800;padding:12px 18px;border-radius:12px;margin-top:12px}.content{background:rgba(13,32,40,.75);border:1px solid var(--line);border-radius:24px;padding:32px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}.card{background:rgba(18,48,58,.85);border:1px solid var(--line);padding:18px;border-radius:18px}.card b{display:block;color:var(--text);margin-bottom:8px}h1,h2,h3{line-height:1.2}h2{margin-top:34px;color:#dffcf4}blockquote{border-left:4px solid var(--brand);padding:10px 16px;background:rgba(0,196,140,.08);border-radius:10px;color:#d5ebe7}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;margin:18px 0;background:rgba(255,255,255,.03);border-radius:14px;overflow:hidden}th,td{border-bottom:1px solid var(--line);padding:10px;vertical-align:top}th{color:#061015;background:var(--brand2);text-align:left}code{background:rgba(255,255,255,.08);padding:2px 5px;border-radius:6px}.top{margin-bottom:18px;color:var(--muted)}.nextprev{display:flex;justify-content:space-between;gap:12px;margin-top:24px}.nextprev a{border:1px solid var(--line);border-radius:12px;padding:10px 14px;background:rgba(255,255,255,.04)}[dir=rtl] .side{border-left:1px solid var(--line);border-right:0}[dir=rtl] th{text-align:right}[dir=rtl] blockquote{border-right:4px solid var(--brand);border-left:0}@media(max-width:860px){.layout{display:block}.side{position:relative;height:auto}.main{padding:24px 16px}.content{padding:22px}.nav{columns:1}}
""".strip()
    (OUT / "styles.css").write_text(css, encoding="utf-8")

    nav_links = "".join(f'<a href="/academy/{item["href"]}">{html.escape(item["title"])}</a>' for item in nav["es"])
    cards = "".join(
        f'<a class="card" href="/academy/{item["href"]}"><b>{html.escape(item["title"])}</b><span>Open lesson</span></a>'
        for item in nav["es"]
    )
    index = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Academia de Ventas Solaris Panama</title><meta name="robots" content="noindex,follow"><link rel="stylesheet" href="/academy/styles.css"></head><body><div class="layout"><aside class="side"><div class="brand">Solaris Academy</div><div class="sub">Training for the Solaris Panama sales team</div><div class="lang"><a class="active" href="/academy/">Español</a><a href="/academy/en/README.html">English</a><a href="/academy/he/README.html">עברית</a></div><nav class="nav">{nav_links}</nav></aside><main class="main"><section class="hero"><h1>Academia de Ventas Solaris Panama</h1><p>Un link limpio para que el equipo de ventas estudie los módulos de la academia — sin abrir GitHub.</p><a class="cta" href="/academy/es/README.html">Empezar la academia</a></section><section class="cards">{cards}</section></main></div></body></html>'''
    (OUT / "index.html").write_text(index, encoding="utf-8")

    for lang, path in module_files:
        lang_dir = OUT / lang
        lang_dir.mkdir(exist_ok=True)
        slug = path.stem
        title = title_of(path)
        direction = "rtl" if lang == "he" else "ltr"
        items = nav[lang]
        idx = next(i for i, item in enumerate(items) if item["slug"] == slug)
        prev_link = f'<a href="/academy/{items[idx-1]["href"]}">← Previous</a>' if idx > 0 else "<span></span>"
        next_link = f'<a href="/academy/{items[idx+1]["href"]}">Next →</a>' if idx < len(items) - 1 else "<span></span>"
        side_nav = "".join(
            f'<a {"class=active" if item["slug"] == slug else ""} href="/academy/{item["href"]}">{html.escape(item["title"])}</a>'
            for item in items
        )
        body = markdown_to_html(path.read_text(encoding="utf-8"))
        page = f'''<!doctype html><html lang="{lang}" dir="{direction}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)} | Solaris Academy</title><meta name="robots" content="noindex,follow"><link rel="stylesheet" href="/academy/styles.css"></head><body><div class="layout"><aside class="side"><div class="brand">Solaris Academy</div><div class="sub">Academia de Ventas</div><div class="lang">{language_switch_links(lang, slug)}</div><nav class="nav">{side_nav}</nav></aside><main class="main"><div class="top"><a href="/academy/">Academy home</a> / {html.escape(LANGS[lang])}</div><article class="content">{body}<div class="nextprev">{prev_link}{next_link}</div></article></main></div></body></html>'''
        (lang_dir / f"{slug}.html").write_text(page, encoding="utf-8")

    print(json.dumps({"generated_files": len(list(OUT.rglob("*"))), "out": str(OUT)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
