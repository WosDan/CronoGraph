# Modelo Matemático de CronoGraph

## 1. Grafo bipartito y matriz de biadyacencia

Sean $S$ el conjunto de estudiantes y $E$ el conjunto de evaluaciones parciales. El grafo bipartito no dirigido se define como $G_B = (S \cup E, M)$, cuya matriz binaria de biadyacencia $B \in \{0,1\}^{|S| \times |E|}$ cumple:

$$B_{si} = \begin{cases} 1 & \text{si el estudiante } s \in S \text{ presenta el parcial } i \in E, \\ 0 & \text{en caso contrario.} \end{cases}$$

A partir de $B$ se construye la matriz simétrica de co-matrícula (estudiantes compartidos):

$$A = B^\top B \in \mathbb{Z}_{\ge 0}^{|E| \times |E|}, \qquad A_{ij} = \sum_{s \in S} B_{si} B_{sj}$$

- La diagonal $A_{ii}$ corresponde al total de estudiantes inscritos en el parcial $i$.
- Para $i \neq j$, $A_{ij}$ representa el número exacto de estudiantes que cursan simultáneamente ambos parciales.

---

## 2. Peso académico del parcial

Cada parcial $i \in E$ recibe un peso académico determinista:

$$V_i=C_i p_i, \qquad W_i = V_i \left(1 + \frac{r_i}{2}\right)$$

donde:
- $C_i \in \mathbb{Z}$, $C_i \geq 1$: créditos académicos de la asignatura.
- $p_i \in (0, 1]$: porcentaje de evaluación del parcial respecto a la nota definitiva.
- $r_i \in [0, 1]$: índice histórico de retiro de la asignatura, expresado como proporción.

Un crédito equivale a 48 horas de carga formal durante el período, incluidas actividades distintas de la preparación del parcial. El producto $C_i p_i$ es una decisión metodológica proporcional, no una fórmula legal. El retiro es un factor contextual de priorización, no una medida causal de dificultad ni evidencia de que las fechas provoquen retiros. El incremento máximo del 50 % requiere calibración.

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

El promedio de pesos es una elección simétrica del proyecto para representar la importancia conjunta del par.

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
   Mide la intensidad estructural total de sus conexiones antes de considerar las fechas. Es una variante ponderada normalizada por el máximo observado; no es la centralidad no ponderada deg(i)/(n−1) definida en clase. Si el máximo es cero, la implementación devuelve cero.

2. **Centralidad de Intermediación ($C_B(i)$)**:
   Calculada con `nx.betweenness_centrality(G_C, weight="centrality_distance", normalized=True)`, usando distancia `1 / H_ij` para que una relación de conflicto más fuerte corresponda a una distancia más corta:
   $$C_B(i) = \frac{2}{(|E|-1)(|E|-2)} \sum_{\substack{s<t \\ s,t\ne i}} \frac{\sigma_{st}(i)}{\sigma_{st}}$$
   Identifica evaluaciones que aparecen en caminos más cortos entre otros parciales según esas distancias. Esta medida por sí sola no garantiza que reprogramarlas mejore el calendario.

3. **Centralidad de Cercanía ($C_C(i)$)**:
   Calculada con `nx.closeness_centrality(G_C)`:
   Para un grafo conexo, $C_C(i) = \frac{|E| - 1}{\sum_{j \neq i} \text{dist}(i, j)}$. NetworkX aplica el ajuste predeterminado Wasserman–Faust cuando el grafo es desconexo: si la componente tiene c nodos y la red N, multiplica la cercanía calculada dentro de la componente por (c−1)/(N−1). Los nodos aislados reciben cero; no se usa la variante armónica. Esta medida usa distancias sin ponderar y resume la cercanía al resto de la red de conflictos.

## 7. Interpretación transparente y proyección educativa

La penalización de 0–3 días, con cero desde cuatro días, es un parámetro del proyecto; no es un umbral universal demostrado. La factibilidad y la calidad se evalúan por separado: dos parciales el mismo día pueden ser factibles si sus horas no se solapan y aun así recibir penalización.

Los docentes deben autorizar fechas en las que los contenidos y la preparación sean académicamente viables; el avance de temas no se comprueba automáticamente. Sin identificador de aula tampoco se pueden detectar sus choques. Intermediación y grado ponderado orientan algunos inicios y desempates; cercanía es visual. Ninguna centralidad sustituye la evaluación de F.

Hacer explícitas estas decisiones permite discutir calendarios con estudiantes y docentes y analizar qué recomendaciones cambian al variar los parámetros. Ese es el potencial educativo propuesto: apoyar coordinación y decisiones revisables. La reducción de F no demuestra por sí sola bienestar, menor estrés o mejor rendimiento.

## 8. Validación y extensión no implementada

Se propone observar horas reales de preparación con diarios, contrastarlas con estimaciones docentes y usar calificaciones o reprobación como indicadores complementarios. Spearman permitiría evaluar asociación monotónica con horas observadas, sin inferir causalidad. Deben calibrarse pesos y umbrales mediante sensibilidad y datos reales.

Una extensión futura es:

$$F^*=\sum_{i<j}K_{ij}+\lambda\sum_i|d_i-d_i^0|+\mu B_{\max}.$$

Busca estabilidad y menor concentración individual. Requiere definir Bmax y calibrar los coeficientes; **no forma parte del objetivo implementado**. Las restricciones obligatorias de disponibilidad, duración, ±14 días y solapamientos ya están implementadas. Véanse las [referencias y delimitación de afirmaciones](references.md).
