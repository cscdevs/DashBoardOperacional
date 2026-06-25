# Design System - Portal CSC

Este documento descreve as diretrizes arquiteturais, os Design Tokens e as regras visuais implementadas neste projeto (arquivados em `src/index.css`). O respeito a estas regras é fundamental para manter a identidade "Premium, Imersiva e Dinâmica" exigida pela plataforma.

## 1. Tipografia

- **Fonte Principal (Sans-serif):** `Montserrat` (Pesos: 400, 500, 600, 700, 800, 900)
  *Uso: Corpo de texto, Títulos, Botões, Navegação.*
- **Fonte Secundária (Monospace):** `IBM Plex Mono` (Pesos: 400, 700)
  *Uso: Indicadores de performance (KPIs), IDs, números de destaque e código.*

## 2. Paleta de Cores & Tokens CSS

Todas as cores são injetadas em variáveis do `:root` para fácil adoção de temas dinâmicos.

### Cores Primárias (Ação/Marca)
- `--blue`: `#1B0DAE`
- `--blue-light`: `#3D2FD4`
- `--blue-dark`: `#140A8C`
- `--blue-50`: `#EDEAFC`
- `--blue-100`: `#D5D0F8`

### Cores Neutras (Fundo/Texto)
| Escala (Light) | Hexadecimal | Escala (Dark Mode) | Hexadecimal |
|---|---|---|---|
| `--gray-50` | `#F8F9FB` | `--gray-50` | `#101828` |
| `--gray-100`| `#F1F3F6` | `--gray-100`| `#1D2939` |
| `--gray-200`| `#E4E7EC` | `--gray-200`| `#344054` |
| `--gray-400`| `#98A1B3` | `--gray-400`| `#6B7588` |
| `--gray-500`| `#6B7588` | `--gray-500`| `#98A1B3` |
| `--gray-700`| `#344054` | `--gray-700`| `#D0D5DD` |
| `--gray-900`| `#101828` | `--gray-900`| `#F8F9FB` |
| `--white`   | `#FFFFFF` | `--white`   | `#1D2939` |

### Cores de Status (Feedback)
- **Sucesso:** `--success` (`#137333`) | `--success-bg` (`#E6F4EA`)
- **Atenção:** `--warning` (`#B06000`) | `--warning-bg` (`#FEF7E0`)
- **Perigo:** `--danger` (`#C4320A`) | `--danger-bg` (`#FEE4E2`)

## 3. Sombras, Glassmorphism e Dark Mode

O sistema conta com três níveis principais de sombra:
- `--shadow-sm`: Para botões sutis, cards estáticos e navegação primária.
- `--shadow-md`: Efeito de "levitação" ao passar o mouse (`:hover`) sobre os cartões.
- `--shadow-lg`: Reservado para modais e popups flutuantes.

> No **Modo Escuro (classe `.dark`)**, as sombras ganham opacidade dobrada (usando canais pretos diretos) pois a ausência de luz de fundo requer sombras mais espessas para gerar contraste. O mapa geográfico do projeto possui um filtro CSS próprio que inverte a luz e saturação automaticamente.

**Efeitos de Glassmorphism (Vidro Fosco):**
Painéis flutuantes como a Sidebar, Header e Tooltips do Mapa utilizam a classe utilitária de `backdrop-filter: blur(16px)` aliada a fundos semi-transparentes (`rgba`) e bordas vítreas (`--glass-border`) para criar uma sensação de profundidade sobre o fundo da tela.

## 4. Estruturas Utilitárias e Modo TV

A plataforma gerencia o layout de forma modular pelo CSS nativo:
- `.app-container`: Trava a tela com um `max-width: 1400px` em resoluções Ultra-wide e centraliza o conteúdo.
- **Grids de KPI Homogêneos:** Os componentes `<Card>` foram flexibilizados com `height: 100%`, `display: flex` e `flex-direction: column` garantindo que painéis vizinhos na mesma linha tenham exatamente a mesma altura física independente do tamanho do texto.
- **Modo TV (Imersivo):** Ao acionar o Modo TV na barra superior, a tela toma conta do monitor inteiro via API nativa de Fullscreen, a barra lateral e o cabeçalho desaparecem, e as margens do `.app-container` são resetadas para que os gráficos ocupem 100% da área útil visual. Ideal para televisões em paredes de centros operacionais (NOC).

## 5. Micro-interações e Animações de Ponta

O aplicativo prioriza micro-interações ("WOW Factor"):
- **Staggering Fade In:** Elementos que entram na tela não apenas aparecem, mas entram em cascata sequencial utilizando a classe `.stagger-item` aliada a transição vertical e escala.
- **3D Tilt Hover:** Cartões cruciais (KPIs do Dashboard) recebem a classe `.card-3d-tilt`, gerando um efeito visual tridimensional ao rotacionar os eixos X e Y enquanto o mouse passeia pela sua superfície.
- **Backgrounds Dinâmicos (Deep Tech):** O fundo não é estático. Atrás do Glassmorphism habita a classe `.ambient-background`, que rotaciona e pulsa gradientes radiais coloridos em um ciclo suave de 15 a 30 segundos, trazendo a tela "à vida".

## 6. Recursos Premium de UX

- **Spotlight Search (`Ctrl + K`):** Adicionamos um atalho universal para gestores abrirem rapidamente qualquer relatório pelo teclado através de um modal centralizado de pesquisa fluida e responsiva (inspirado no macOS Spotlight).
- **Sidebar Dinâmica:** A barra lateral possui comportamento fluído, permitindo recolhimento completo para expandir a área útil da tela em Monitores pequenos, e sobreposição (Overlay) responsiva no celular.
- **Modo de Impressão Executiva (`@media print`):** Ao dar "Ctrl + P", todos os menus, botões e controles desaparecem magicamente. Os fundos vitrificados dão espaço para o branco puro (economizando tinta), e um timbre "Relatório Executivo CSC - Confidencial" é adicionado automaticamente ao documento, com regras de layout anti-quebra de páginas.

## 7. Componentes React Padronizados

Para garantir a fluidez de desenvolvimento, utilizamos componentes em `src/components/ui`:
- `<Button variant="primary | secondary | danger">`
- `<Card className="card-3d-tilt">`
- `<SpotlightSearch>`: Motor central da barra de busca inteligente.
- `<Drawer>`: Modais deslizantes para filtros laterais ou configurações.
- `<BrazilMap>`: Componente base inteligente para plotagem de metadados geográficos com Leaflet.
