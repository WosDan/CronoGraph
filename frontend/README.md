# Interfaz de CronoGraph

Aplicación React y TypeScript para explorar datos, grafos, calendarios y resultados del simulador. La aplicación estable está en <https://crono-graph.vercel.app/>; el [README principal](../README.md) describe instalación completa y alcance académico.

## Desarrollo

Con el backend iniciado, desde esta carpeta:

```bash
npm ci
npm run dev
```

`VITE_API_BASE_URL` configura la URL de la API y su prefijo `/api`; el valor local predeterminado es `http://127.0.0.1:8000/api`. Cambiarla requiere reiniciar desarrollo o recompilar. Para comprobar la interfaz:

```bash
npm test
npm run build
```

## Recorrido y decisiones revisables

Las ocho vistas son Inicio, Calendario, Estudiantes, Modelo matemático, Datos, Grafos, Optimización y Resultados. Calendario compara la programación inicial y la propuesta y permite inspeccionar parciales y franjas. Resultados reúne costos, factibilidad y explicaciones. Estudiantes muestra horarios individuales y cuenta personas con menos, igual o más pares a 0–3 días.

Los colores de cada horario reflejan la menor separación frente a otro parcial: rojo 0–1 días, ámbar 2–3, verde ≥4 y gris sin otro parcial. Estos indicadores describen proximidad temporal, no estrés, bienestar o rendimiento.

La interfaz busca que estudiantes, docentes y coordinadores puedan revisar qué cambió y bajo qué criterios. Esta transparencia puede apoyar una planificación educativa más coordinada; su utilidad institucional requiere pilotos reales y autorización académica. El backend valida objetivo y factibilidad, mientras el frontend presenta los resultados y calcula comparaciones temporales individuales.

## Límites que deben conservarse en la comunicación

La búsqueda local no demuestra mínimo global. CP-SAT corre en el backend Railway sin una API de Google; `OPTIMAL` certifica el modelo redondeado a escala 10⁴. El avance de contenidos no se comprueba automáticamente. Los pesos y umbrales son decisiones del equipo pendientes de validación. Véanse el [modelo](../docs/mathematical_model.md), la [arquitectura](../docs/architecture.md) y los [informes y presentación](../README.md#informes-resultados-y-presentación).

Los datos incluidos son sintéticos. Para una demostración reproducible, restaurar el conjunto de demostración y usar búsqueda local, semilla 42 y 15 reinicios. Un despliegue posterior o un dataset distinto puede producir otra salida; debe distinguirse el resultado visible de la corrida documentada.
