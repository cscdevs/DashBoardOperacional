# Design System - Portal CSC

Este documento descreve as diretrizes arquiteturais, os Design Tokens e as regras visuais implementadas neste projeto (arquivados em `src/index.css`). O respeito a estas regras é fundamental para manter a identidade "Premium e Dinâmica" exigida pela plataforma.

## 1. Tipografia

- **Fonte Principal (Sans-serif):** `Montserrat` (Pesos: 400, 500, 600, 700, 800, 900)
  *Uso: Corpo de texto, Títulos, Botões, Navegação.*
- **Fonte Secundária (Monospace):** `IBM Plex Mono` (Pesos: 400, 700)
  *Uso: Indicadores de performance (KPIs), IDs, números de destaque e código.*

## 2. Paleta de Cores & Tokens CSS

Todas as cores são injetadas em variáveis do `:root` para fácil adoção de temas.

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

## 3. Sombras, Profundidade e Dark Mode

O sistema conta com três níveis principais de sombra:
- `--shadow-sm`: Para botões sutis, cards estáticos e navegação primária.
- `--shadow-md`: Efeito de "levitação" ao passar o mouse (`:hover`) sobre os cartões.
- `--shadow-lg`: Reservado para modais e popups flutuantes.

> No **Modo Escuro (classe `.dark`)**, as sombras ganham opacidade dobrada (usando canais pretos diretos) pois a ausência de luz de fundo requer sombras mais espessas para gerar contraste. O mapa geográfico do projeto possui um filtro CSS próprio que inverte a luz e saturação automaticamente.

## 4. Estruturas Utilitárias (Grid Modulares)

Em vez de usar bibliotecas pesadas de Grid ou frameworks utilitários verbosos (como Tailwind), a plataforma gerencia o layout de forma modular pelo CSS nativo:
- `.app-container`: Trava a tela com um `max-width: 1400px` em resoluções Ultra-wide e centraliza o conteúdo.
- `.grid-1-2` e `.grid-2-1`: Frações inteligentes de layout responsivo que quebram para colunas empilhadas no formato mobile abaixo de 768px.
- `.card`: Unidade de empacotamento base. Todos os painéis estatísticos e mapas usam essa classe, que já conta com transições animadas pré-embarcadas de `.3s ease`.

## 5. Guias de Animação

O aplicativo prioriza micro-interações ("WOW Factor"):
- Todos os elementos que entram na tela possuem a classe utilitária `.fade-in` que utiliza a keyframe de transição vertical + transparência (de baixo para cima em 0.5s).
- Ao passar o mouse em botões e cards de informação, deve-se aplicar alterações no transform (Ex: `translateY(-2px)`) sem saltos abruptos.

## 6. Componentes React Padronizados

Para garantir a fluidez de desenvolvimento, utilizamos componentes em `src/components/ui`:
- `<Button variant="primary | secondary | danger">`
- `<Card>`
- `<BrazilMap>`: Componente base inteligente para plotagem de metadados geográficos com Leaflet.
