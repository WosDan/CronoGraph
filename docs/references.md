# Referencias Bibliográficas y Delimitación Metodológica

## 1. Bibliografía científica verificable

1. **Carter, M. W., Laporte, G., & Lee, S. Y. (1996).** Examination timetabling: Algorithmic strategies and applications. *Journal of the Operational Research Society*, 47(3), 373–383.  
   *(Establece la formulación clásica del problema de programación de exámenes basado en grafos de conflictos por matrículas compartidas).*

2. **Qu, R., Burke, E. K., McCollum, B., Merlot, L. T. G., & Lee, S. Y. (2009).** A survey of search methodologies and automated system development for examination timetabling. *Journal of Scheduling*, 12(1), 55–89.  
   *(Revisión comprehensiva de metaheurísticas, búsqueda local, restricciones duras y blandas en horarios universitarios).*

3. **McCollum, B., Schaerf, A., Paechter, B., McMullan, P., Lewis, R., Parkes, A. J., Di Gaspero, L., Qu, R., & Burke, E. K. (2010).** Setting the research agenda in automated timetabling: The second international timetabling competition. *INFORMS Journal on Computing*, 22(1), 120–130.  
   *(Estandarización de restricciones institucionales, evaluación de proximidad entre exámenes y comparación justa de algoritmos).*

4. **Diestel, R. (2017).** *Graph Theory* (5th ed.). Springer-Verlag.  
   *(Fundamentación formal de grafos bipartitos, matrices de incidencia y proyecciones ponderadas).*

5. **Perron, L., & Furnon, V.** *OR-Tools* (Google Optimization Tools — CP-SAT Solver).  
   *(Motor de programación por restricciones utilizado como referencia exacta complementaria).*

---

## 2. Decisiones metodológicas propias de CronoGraph

Para evitar atribuir a la literatura científica parámetros propios de este proyecto académico, se deja constancia explícita de que las siguientes definiciones son **diseño metodológico propio de CronoGraph**:
- La ponderación académica $W_i = C_i \cdot p_i \cdot (1 + r_i/2)$.
- La penalización temporal lineal acotada a 4 días calendario $P(\Delta) = \max(0, 4 - \Delta)$.
- El promedio aritmético $(W_i + W_j)/2$ para construir el componente fijo $H_{ij}$.
