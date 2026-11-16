# Modelo Matemático de CronoGraph

## 1. Grafo bipartito e incidencia

Sean $S$ el conjunto de estudiantes y $E$ el conjunto de evaluaciones parciales. El grafo bipartito no dirigido se define como $G_B = (S \cup E, M)$, cuya matriz de incidencia binaria $B \in \{0,1\}^{|S| \times |E|}$ cumple:

$$B_{si} = \begin{cases} 1 & \text{si el estudiante } s \in S \text{ presenta el parcial } i \in E, \\ 0 & \text{en caso contrario.} \end{cases}$$

A partir de $B$ se construye la matriz simétrica de co-matrícula (estudiantes compartidos):

$$A = B^\top B \in \mathbb{Z}_{\ge 0}^{|E| \times |E|}, \qquad A_{ij} = \sum_{s \in S} B_{si} B_{sj}$$

- La diagonal $A_{ii}$ corresponde al total de estudiantes inscritos en el parcial $i$.
- Para $i \neq j$, $A_{ij}$ representa el número exacto de estudiantes que cursan simultáneamente ambos parciales.

---

## 2. Peso académico del parcial

Cada parcial $i \in E$ recibe un peso académico determinista:

$$W_i = C_i \cdot p_i \cdot \left(1 + \frac{r_i}{2}\right)$$

donde:
- $C_i \in \mathbb{Z}$, $C_i \geq 1$: créditos académicos de la asignatura.
- $p_i \in (0, 1]$: porcentaje de evaluación del parcial respecto a la nota definitiva.
- $r_i \in [0, 1]$: índice histórico de retiro de la asignatura, expresado como proporción.

---

## 3. Penalización temporal

Dadas las fechas calendario $d(x_i)$ y $d(x_j)$ asignadas a los parciales $i$ y $j$, la distancia temporal en días calendario es $\Delta_{ij} = |d(x_i) - d(x_j)|$. La función de penalización temporal es:

$$P(\Delta_{ij}) = \max(0,\, 4 - \Delta_{ij})$$

| Distancia $\Delta_{ij}$ | Penalización $P(\Delta_{ij})$ |
| :---: | :---: |
| $0$ | $4$ |
| $1$ | $3$ |
| $2$ | $2$ |
| $3$ | $1$ |
| $\ge 4$ | $0$ |

---

## 4. Peso estructural fijo y peso dinámico de las aristas

El grafo de conflictos $G_C = (E, \mathcal{A})$ contiene una arista $\{i, j\} \in \mathcal{A}$ para todo par $i < j$ con $A_{ij} > 0$.

- **Componente estructural fijo** (independiente del calendario):
  $$H_{ij} = A_{ij} \cdot \frac{W_i + W_j}{2}$$
- **Componente dinámico** (dependiente de las fechas asignadas):
  $$K_{ij} = H_{ij} \cdot P(\Delta_{ij}) = A_{ij} \cdot P(\Delta_{ij}) \cdot \frac{W_i + W_j}{2}$$

Las aristas con $A_{ij} > 0$ nunca se eliminan del grafo cuando $K_{ij} = 0$, ya que conservan su relación estructural $H_{ij} > 0$.

---

## 5. Función objetivo y restricciones obligatorias

$$\min_{x} \; F(x) = \sum_{\substack{\{i, j\} \in \mathcal{A} \\ i < j}} K_{ij}(x_i, x_j)$$

sujeto a las siguientes restricciones duras (obligatorias):
0. **Límite de reprogramación**: $|d(x_i)-d(x_i^{(0)})| \leq 14$ días calendario, donde $x_i^{(0)}$ es la franja inicial.
1. **Dominio autorizado**: $x_i \in D_i$, donde $D_i$ contiene únicamente sesiones habituales de clase del docente/grupo y espacios de sábado marcados explícitamente con `authorized = true`.
2. **Duración completa**: $[\text{start}(x_i), \text{start}(x_i) + \text{duration}_i] \subseteq [\text{start}(x_i), \text{end}(x_i)]$.
3. **No solapamiento estudiantil**: si $A_{ij} > 0$ y $d(x_i) = d(x_j)$, sus intervalos horarios de evaluación efectiva no pueden intersectarse.
4. **No solapamiento docente**: si $\text{teacher}_i = \text{teacher}_j$ y $d(x_i) = d(x_j)$, sus intervalos horarios no pueden intersectarse.
5. **No solapamiento de aula**: si ambos parciales especifican aula asignada en la misma fecha y hora, el aula no puede repetirse simultáneamente.

---

## 6. Medidas de centralidad sobre el grafo de conflictos $G_C$

Para identificar estructuralmente qué evaluaciones concentran mayor acoplamiento estudiantil o actúan como puentes críticos entre programas y grupos, el backend calcula tres métricas sobre $G_C = (E, \mathcal{A})$ mediante `NetworkX`:

1. **Centralidad de Grado Ponderado normalizada ($C_D^{(w)}(i)$)**:
   $$S_i = \sum_{j \in N(i)} H_{ij}, \qquad C_D^{(w)}(i) = \frac{S_i}{\max_{k \in E} S_k}$$
   Mide la presión estructural total que el parcial $i$ ejerce sobre sus vecinos antes de considerar la distancia temporal.

2. **Centralidad de Intermediación ($C_B(i)$)**:
   Calculada con `nx.betweenness_centrality(G_C, weight="centrality_distance", normalized=True)`, usando distancia `1 / H_ij` para que una relación de conflicto más fuerte corresponda a una distancia más corta:
   $$C_B(i) = \frac{2}{(|E|-1)(|E|-2)} \sum_{s \neq i \neq t} \frac{\sigma_{st}(i)}{\sigma_{st}}$$
   Identifica evaluaciones que aparecen en caminos más cortos entre otros parciales según esas distancias. Esta medida por sí sola no garantiza que reprogramarlas mejore el calendario.

3. **Centralidad de Cercanía ($C_C(i)$)**:
   Calculada con `nx.closeness_centrality(G_C)`:
   Para un grafo conexo, $C_C(i) = \frac{|E| - 1}{\sum_{j \neq i} \text{dist}(i, j)}$. NetworkX aplica un ajuste cuando el grafo es desconexo. Esta medida usa distancias sin ponderar y resume la cercanía al resto de la red de conflictos.
