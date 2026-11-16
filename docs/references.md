# Referencias y delimitación de la evidencia

Esta bibliografía mantiene los metadatos de los informes APA e IEEE. Cada fuente respalda el aspecto indicado a continuación; los parámetros propios de CronoGraph no se presentan como leyes ni como resultados validados por esos trabajos.

## Referencias de los informes

- Aslanian, A. (2021, julio). *Literature review on reasons for course withdrawals*. Crafton Hills College. <https://www.craftonhills.edu/faculty-and-staff/committees/enrollment-strategies-committee/_archive/meetings/2021/10-04/course-withdrawal-lit-review-final.pdf>

- Bassimir, B., y Wanka, R. (2025). On the computation of robust examination timetables: Methods and experimental results. *Journal of Scheduling, 28*, 159–181. <https://doi.org/10.1007/s10951-024-00815-y>

- Boldt, D. J., Kassis, M. M., y Smith, W. J. (2017). Factors impacting the likelihood of student withdrawals in core business classes. *Journal of College Student Retention: Research, Theory & Practice, 18*(4), 415–430. <https://doi.org/10.1177/1521025115606452>

- Caramia, M., Dell'Olmo, P., e Italiano, G. F. (2008). Novel local-search-based approaches to university examination timetabling. *INFORMS Journal on Computing, 20*(1), 86–99. <https://doi.org/10.1287/ijoc.1070.0220>

- Carter, M. W., Laporte, G., y Chinneck, J. W. (1994). A general examination scheduling system. *Interfaces, 24*(3), 109–120. <https://doi.org/10.1287/inte.24.3.109>

- Concordia University. (s. f.). *Develop a balanced assessment plan*.  <https://www.concordia.ca/ctl/resources/assessment-grading/develop-a-balanced-plan.html>

- Google. (s. f.). *CP-SAT solver*. OR-Tools. <https://developers.google.com/optimization/cp/cp_solver>

- Hachey, A. C., Wladis, C., y Conway, K. M. (2023). Investigating online versus face-to-face course dropout: Why do students say they are leaving? *Education Sciences, 13*(11), 1122. <https://doi.org/10.3390/educsci13111122>

- Lai, X., Lu, X., y Jin, B. (2026). Data-driven university examination timetabling with consideration of student stress. *Computers & Operations Research, 192*, 107496. <https://doi.org/10.1016/j.cor.2026.107496>

- Liborius, P., Bellhäuser, H., y Schmitz, B. (2019). What makes a good study day? An intraindividual study on university students' time investment by means of time-series analyses. *Learning and Instruction, 60*, 310–321. <https://doi.org/10.1016/j.learninstruc.2017.10.006>

- National Institute of Standards and Technology. (1997). *Rank correlation*. Dataplot reference manual. <https://www.itl.nist.gov/div898/software/dataplot/refman2/ch2/rankcorr.pdf>

- Presidencia de la República de Colombia. (2019). *Decreto 1330 de 2019*.  <https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=98270>

- Qu, R., Burke, E. K., McCollum, B., Merlot, L. T. G., y Lee, S. Y. (2009). A survey of search methodologies and automated system development for examination timetabling. *Journal of Scheduling, 12*, 55–89. <https://doi.org/10.1007/s10951-008-0077-5>

- Siew, E. S. K., Sze, S. N., Goh, S. L., Kendall, G., Sabar, N. R., y Abdullah, S. (2024). A survey of solution methodologies for exam timetabling problems. *IEEE Access, 12*, 41479–41498. <https://doi.org/10.1109/ACCESS.2024.3378054>

- United Nations Statistics Division. (s. f.). *Time-use diaries*.  <https://unstats.un.org/UNSDWebsite/demographic-social/time-use/guidelines/III/>

- University of Antwerp. (2025, septiembre). *Mind the gap! Estimating student workload for your course*.  <https://www.uantwerpen.be/en/centres/centre-expertise-higher-education/didactic-information/teaching-tips/curriculum/student-workload/>

## Qué respalda cada grupo de fuentes

- **Programación de exámenes:** Carter et al. (1994), Qu et al. (2009), Caramia et al. (2008) y Siew et al. (2024) contextualizan el problema y las familias de métodos. No prueban la superioridad de nuestro algoritmo.
- **Robustez y estrés:** Bassimir y Wanka (2025) estudian incertidumbre; Lai et al. (2026) incorporan una evaluación específica de estrés. Estas capacidades no se atribuyen a CronoGraph.
- **Carga y planificación:** el Decreto 1330 establece 48 horas por crédito durante el período; Concordia orienta la ponderación y distribución de evaluaciones; Antwerp propone contrastar carga prevista y observada. No establecen nuestra fórmula de peso ni una separación universal de cuatro días.
- **Retiros:** Boldt et al. (2017), Hachey et al. (2023) y Aslanian (2021) describen factores diversos. No permiten afirmar que las fechas causen retiros ni que retiro equivalga a dificultad.
- **Validación futura:** Liborius et al. (2019), UNSD y NIST motivan registrar tiempo de estudio y estudiar asociaciones mediante Spearman. Asociación no equivale a causalidad.
- **CP-SAT:** la documentación oficial explica el solucionador y sus estados. La escala 10⁴, la formulación y la ejecución en Railway son decisiones de implementación del proyecto.

## Correcciones bibliográficas relevantes

El DOI `10.3390/educsci13111122` corresponde a **Hachey, Wladis y Conway (2023)**, no Lee y Choi. El trabajo de **Liborius, Bellhäuser y Schmitz se cita como 2019**, por el volumen 60, aunque tuvo publicación anticipada en 2017. Boldt et al. corresponde al volumen de 2017, con publicación anticipada en 2015; Bassimir y Wanka al volumen de 2025, con publicación anticipada en 2024. El manual Rank correlation de NIST tiene fecha de marzo de 1997.

## Decisiones del proyecto y alcance de las conclusiones

Son decisiones metodológicas propias: `Vi = Ci*pi`, `Wi = Vi*(1+ri/2)`, el promedio de pesos del par y `P(Δ)=max(0,4−Δ)`. Requieren calibración y sensibilidad. La extensión con estabilidad y Bmax no está implementada; disponibilidad, duración, ±14 días y restricciones de solapamiento sí lo están.

La corrida de 20 parciales sintéticos es evidencia del funcionamiento del motor en esa instancia, no de efectos educativos causales. La proyección de una planificación más coordinada y transparente se plantea como potencial de uso que deberá evaluarse con datos reales, pilotos y participación de la comunidad académica. Véase la [evidencia](evidencia_simulador/ejecucion_2026-11-16.json).
