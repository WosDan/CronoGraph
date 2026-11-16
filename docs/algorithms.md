# Algoritmos de Optimización en CronoGraph

## 1. Búsqueda Local con Cálculo Incremental ($\Delta F_i(t)$)

Al evaluar el cambio de franja del parcial $i$ desde su asignación actual $x_i$ (con fecha $d_i$) hacia una franja candidata factible $t \in D_i$ (con fecha $d(t)$), el cambio exacto en la función objetivo depende únicamente de los vecinos $N(i)$ de $i$ en el grafo de conflictos $G_C$:

$$\Delta F_i(t) = \sum_{j \in N(i)} H_{ij} \Big[ P\big(|d(t) - d_j|\big) - P\big(|d_i - d_j|\big) \Big]$$

- **Complejidad por movimiento**: $O(|N(i)|)$ en lugar de $O(|\mathcal{A}|)$.
- **Verificación de restricciones**: antes de calcular $\Delta F_i(t)$, `can_assign_exam_slot` verifica dominio autorizado, ventana inclusiva de ±14 días calendario, duración completa y cero solapamientos con los demás parciales.
- **Verificación empírica**: en cada paso aceptado se contrasta el costo acumulado incrementalmente contra la evaluación global completa $F(x)$, registrando el mayor error observado. Esta comprobación numérica no es una garantía universal de error; en la corrida del informe fue aproximadamente $1.37 \times 10^{-12}$.

---

## 2. Reinicios Aleatorios con Semilla Controlada

Implementado en `backend/app/optimization/random_restarts.py`:
1. El **reinicio 0** parte exactamente del calendario inicial $x^{(0)}$ (si es factible).
2. Los reinicios $1, \dots, R-1$ intentan construir soluciones factibles mediante una **heurística voraz aleatorizada guiada por centralidad**. En cada intento se recorren los parciales en un orden predefinido y se asigna a cada uno la primera franja factible de una lista barajada. En el primer intento, el orden prioriza mayor intermediación, mayor grado ponderado, menor tamaño del dominio autorizado y mayor número de vecinos, en ese orden. En los intentos posteriores, se barajan los parciales y se ordenan por intermediación redondeada, tamaño del dominio y grado ponderado redondeado. Si no se puede asignar un parcial, se descarta el intento completo y se vuelve a empezar, hasta un máximo de 80 intentos. El tamaño del dominio es fijo: no cuenta las franjas que siguen siendo factibles durante la construcción.
3. Cada reinicio desciende mediante búsqueda local hasta un óptimo local.
4. **Política de no empeoramiento**: si el calendario inicial $x^{(0)}$ es factible, el algoritmo garantiza explícitamente $F(x^*) \le F(x^{(0)})$.

---

## 3. Modelo Exacto Complementario con Google OR-Tools (CP-SAT)

En el modo combinado, la búsqueda con reinicios proporciona a CP-SAT una asignación factible inicial cuando está disponible. Al terminar ambos, se muestra como calendario principal el de menor costo original entre los resultados factibles. Si CP-SAT alcanza `OPTIMAL`, la certificación corresponde a su objetivo con coeficientes redondeados, no necesariamente a la función original sin redondear.

Implementado en `backend/app/optimization/ortools_solver.py` para auditar la calidad de la heurística y demostrar optimalidad global en instancias verificables:

- **Variables de decisión**: $y_{i,s} \in \{0, 1\}$ para cada franja $s \in D_i$ donde cabe la duración completa del parcial.
- **Asignación única**: $\sum_{s \in D_i} y_{i,s} = 1 \quad \forall i \in E$.
- **Incompatibilidad horaria**: $y_{i,s} + y_{j,t} \le 1$ para todo par de franjas simultáneas que compartan estudiantes, docente o aula.
- **Linealización temporal por fecha**: variables indicadoras de fecha $d_{i,\delta}$ y variables auxiliares $z_{u,\delta_u,v,\delta_v} \ge d_{u,\delta_u} + d_{v,\delta_v} - 1$ para minimizar una representación de $\sum_{i<j} H_{ij} P(|\delta_u - \delta_v|)$ con coeficientes redondeados a enteros a escala $10^4$.
- El solucionador únicamente etiqueta una solución como **óptima global** (`optimality_proven = True`) cuando CP-SAT retorna estado `OPTIMAL`; esa etiqueta corresponde al modelo redondeado.

## Centralidades en la búsqueda local

Cuando dos movimientos tienen la misma mejora (tolerancia numérica de 10⁻¹²), se prioriza el parcial con mayor grado ponderado y, si persiste el empate, mayor intermediación. Se sigue escogiendo la mayor mejora de la función objetivo; la centralidad no garantiza una solución global ni modifica su valor. La cercanía se utiliza como indicador visual.

## Transparencia de la búsqueda y alcance de los resultados

El método propio usa **mejor mejora**, reinicios y construcción voraz aleatorizada. No implementa DSatur, MRV dinámico ni backtracking. Si la construcción falla, descarta el intento; no encontrar una solución con la heurística no demuestra inviabilidad matemática. El criterio principal de los movimientos es reducir F y la garantía de no empeoramiento presupone un calendario inicial factible.

OR-Tools corre como biblioteca en el backend de Railway, sin una API de Google. `FEASIBLE` no certifica óptimo y `UNKNOWN` por límite de tiempo no demuestra inviabilidad. El modo combinado compara los costos originales de los calendarios factibles, incluso cuando CP-SAT trabaja con el objetivo redondeado.

La traza de convergencia, la factibilidad y las explicaciones permiten revisar la propuesta y sus límites. Una variación aislada del costo de un parcial depende del resto del calendario: no debe interpretarse como causa de un resultado educativo ni como explicación exhaustiva de todos los movimientos.

La corrida documentada de búsqueda local redujo F de 3401,1572 a 571,0577 en 20 parciales sintéticos, semilla 42 y 15 reinicios. No es una comparación experimental con CP-SAT. Véanse la [evidencia](evidencia_simulador/ejecucion_2026-11-16.json) y el [script complementario](../scripts/reproducir_informe.py).

Como trabajo futuro se propone comparar recocido simulado, algoritmos genéticos y programación entera con iguales instancias, restricciones y presupuesto computacional. El mejor costo entre métodos no demuestra óptimo global. Los pilotos educativos deberán evaluar también viabilidad académica y aceptación de las propuestas.
