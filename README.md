# Portafolio – Andrés Salazar

Sitio multi-página en HTML, CSS y JavaScript puro, sin build.
Animaciones con GSAP 3.13 (ScrollTrigger + SplitText) y Lenis 1.3.4, cargados por CDN (jsDelivr) con versiones fijas.

## Estructura

```
index.html            Inicio
work.html             Lista de proyectos
work/*.html           Casos: homi, weris, framea-dloop
web.html              Mi nueva aventura: diseño web (grow. y propuesta)
lost-files.html       Experimentos
sobre-mi.html         Bio + contacto
css/styles.css        Estilos (tokens en :root)
js/main.js            Smooth scroll, animaciones, transiciones, nav notch, cursor, logo de vidrio, fondo líquido, copiar email
js/lost-model.js      Modelo 3D de Lost files (three.js 0.160.0 por importmap, solo en esa página)
content/*.md          Textos fuente de los casos y de Sobre mí
assets/models/        Modelo 3D (.obj)
assets/logo/          Logos en SVG
assets/media/         Videos e imágenes
```

## Cómo abrirlo

Con un servidor local (recomendado):

```
python3 -m http.server 8000
```

Luego abre http://localhost:8000. Con doble clic en `index.html` también abre, pero el modelo 3D de Lost files
no carga (los navegadores bloquean módulos JS y archivos .obj desde file://).
Se necesita internet para cargar GSAP y Lenis. Sin conexión, el sitio se ve igual pero sin animaciones.

## Pendientes

- Media pendiente: busca `TODO media` en los .html (están listados con lo que falta).

- Tipografía: pega el `<link>` de Adobe Fonts donde indica el comentario en el `<head>` de cada página.
  Después revisa en `css/styles.css` el tamaño del nombre del hero (`--hero-fs`, medido con la fuente de respaldo)
  y los `@font-face "AS Fallback"` (size-adjust / ascent-override) para que respaldo y fuente final midan igual.
- CV: el botón "Mi CV" abre `assets/cv/CV-Andres-Salazar.pdf` en una pestaña nueva (reemplaza ese archivo para actualizarlo).

## Rendimiento

- Solo se animan `transform` y `opacity`; todo lo que corre por frame usa el ticker de GSAP (un solo requestAnimationFrame).
- Videos: `preload="none"` + poster; se cargan cerca de la pantalla y se reproducen como máximo 4 a la vez.
- Fondo líquido (WebGL) solo en escritorio; en móvil, equipos de 4 núcleos o menos y con movimiento reducido se usa el gradiente CSS.
- En pantallas táctiles el scroll es nativo (Lenis solo con mouse/trackpad).
