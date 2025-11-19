# 🔍 Buscador Semántico

Motor de búsqueda semántica basado en ontologías OWL con razonamiento automático y algoritmos de similitud avanzados.

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)](https://www.prisma.io/)

---

## 📋 Características

- ✅ **Parser OWL Multi-formato**: Soporta RDF/XML, Turtle, N3, N-Triples
- ✅ **Razonamiento Semántico**: 9 reglas de inferencia RDFS y OWL
- ✅ **Búsqueda Inteligente**: 3 algoritmos de similitud semántica
- ✅ **Query Expansion**: Expansión automática con términos relacionados
- ✅ **API REST Completa**: 9 endpoints documentados con Swagger
- ✅ **Cache Inteligente**: Optimización de performance
- ✅ **Escalable**: Arquitectura modular y configurable

---

## 🏗️ Arquitectura

```
src/
├── common/                   # ⭐ Infraestructura común
│   ├── exceptions/           # Excepciones personalizadas
│   ├── filters/              # Filtros de excepciones
│   ├── pipes/                # Pipes de validación
│   └── interceptors/         # Interceptors (logging, transform)
├── core/
│   ├── ontology/
│   │   ├── parsers/          # Parser OWL/RDF
│   │   │   ├── owl-loader.ts
│   │   │   ├── owl-parser.ts
│   │   │   └── rdf-utils.ts
│   │   ├── reasoner/         # Motor de razonamiento
│   │   │   ├── rule-engine.ts
│   │   │   ├── reasoner.service.ts
│   │   │   └── reasoner.module.ts
│   │   └── types/            # ⭐ Tipos centralizados
│   │       ├── ontology.types.ts
│   │       ├── reasoning.types.ts
│   │       └── index.ts
│   └── semantic/             # Motor de búsqueda
│       ├── semantic-match.ts
│       └── semantic-engine.ts
├── modules/
│   ├── owl/                  # Gestión de ontologías
│   │   ├── dto/
│   │   ├── owl.controller.ts
│   │   ├── owl.service.ts
│   │   └── owl.module.ts
│   └── search/               # Búsqueda semántica
│       ├── dto/
│       ├── search.controller.ts
│       ├── search.service.ts
│       └── search.module.ts
├── config/                   # Configuración
│   ├── owl.config.ts
│   ├── reasoner.config.ts
│   └── search.config.ts
└── prisma/                   # Base de datos
    ├── prisma.service.ts
    └── prisma.module.ts
```

---

## 🚀 Instalación

### Prerequisitos

- Node.js >= 18
- PostgreSQL >= 14
- npm o yarn

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/garcia-bj/semantic-searcher.git
cd semantic-searcher/buscador-semantico
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env`:
```env
DATABASE_URL="postgresql://user:password@host:port/database"
PORT=3000
```

4. **Sincronizar base de datos**
```bash
npx prisma db push
npx prisma generate
```

5. **Iniciar servidor**
```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

---

## 📚 Uso

### Swagger UI

Accede a la documentación interactiva en:
```
http://localhost:3000/api
```

### Ejemplos de API

#### 1. Subir Ontología OWL

```bash
curl -X POST http://localhost:3000/owl/upload \
  -F "file=@ontology.owl" \
  -F "description=Mi ontología"
```

**Respuesta:**
```json
{
  "document": {
    "id": 1,
    "fileName": "1234567890-ontology.owl",
    "tripleCount": 150
  },
  "stats": {
    "totalTriples": 150,
    "classCount": 25,
    "propertyCount": 18,
    "individualCount": 45,
    "inferredTriples": 87
  },
  "message": "OWL file uploaded, parsed and reasoned successfully (87 inferences)"
}
```

#### 2. Búsqueda Semántica

```bash
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "persona",
    "limit": 10,
    "expandQuery": true
  }'
```

**Respuesta:**
```json
{
  "results": [
    {
      "iri": "http://example.org#Person",
      "label": "Person",
      "type": "Class",
      "score": 0.95,
      "match": {
        "labelScore": 1.0,
        "hierarchyScore": 0.0,
        "propertyScore": 0.0,
        "details": "Etiquetas muy similares."
      }
    }
  ],
  "total": 1,
  "took": 45,
  "query": "persona",
  "expandedTerms": ["persona", "empleado", "individuo"]
}
```

#### 3. Autocompletado

```bash
curl "http://localhost:3000/search/suggest?query=pers&limit=5"
```

**Respuesta:**
```json
{
  "suggestions": ["Person", "Personal", "Persona"],
  "query": "pers"
}
```

#### 4. Conceptos Relacionados

```bash
curl "http://localhost:3000/search/related/http%3A%2F%2Fexample.org%23Employee"
```

**Respuesta:**
```json
{
  "results": [
    {
      "iri": "http://example.org#Person",
      "label": "Person",
      "type": "Class",
      "score": 0.85,
      "match": {
        "hierarchyScore": 0.9,
        "propertyScore": 0.7,
        "labelScore": 0.6,
        "details": "Cercanos en jerarquía. Comparten propiedades."
      }
    }
  ],
  "total": 1,
  "took": 12,
  "query": "http://example.org#Employee"
}
```

---

## 🧠 Razonamiento Semántico

### Reglas RDFS Implementadas

1. **Transitividad de subClassOf**
   - Si `A subClassOf B` y `B subClassOf C` → `A subClassOf C`

2. **Inferencia de tipos**
   - Si `x type A` y `A subClassOf B` → `x type B`

3. **Dominio de propiedades**
   - Si `P domain C` y `x P y` → `x type C`

4. **Rango de propiedades**
   - Si `P range C` y `x P y` → `y type C`

### Reglas OWL Implementadas

5. **Clases equivalentes**
   - Si `A equivalentClass B` y `x type A` → `x type B`

6. **Individuos equivalentes**
   - Si `x sameAs y` → todas las propiedades de `x` aplican a `y`

7. **Propiedades inversas**
   - Si `P inverseOf Q` y `x P y` → `y Q x`

8. **Propiedades transitivas**
   - Si `P type TransitiveProperty` y `x P y` y `y P z` → `x P z`

9. **Propiedades simétricas**
   - Si `P type SymmetricProperty` y `x P y` → `y P x`

---

## 🔍 Algoritmos de Similitud

### 1. Wu-Palmer Similarity (Jerarquía)

Mide similitud basándose en la distancia en el árbol de clases.

**Fórmula:**
```
similarity = 2 * depth(LCA) / (depth(c1) + depth(c2))
```

Donde `LCA` = Lowest Common Ancestor (ancestro común más cercano)

**Ejemplo:**
- `Employee` vs `Person`: 0.85 (padre-hijo directo)
- `Employee` vs `Organization`: 0.15 (muy distantes)

### 2. Jaccard Similarity (Propiedades)

Compara propiedades compartidas entre conceptos.

**Fórmula:**
```
similarity = |A ∩ B| / |A ∪ B|
```

**Considera:**
- Propiedades del concepto
- Superclases
- Dominio y rango (para propiedades)

### 3. String Similarity (Etiquetas)

Combina Levenshtein distance y Dice's Coefficient.

**Características:**
- Normalización de texto (lowercase, sin acentos)
- Fuzzy matching tolerante a errores
- Substring matching

---

## ⚙️ Configuración

### Pesos de Similitud

Edita `src/config/search.config.ts`:

```typescript
weights: {
  label: 0.4,       // 40% similitud de etiquetas
  hierarchy: 0.3,   // 30% similitud jerárquica
  properties: 0.3,  // 30% similitud de propiedades
}
```

### Threshold Mínimo

```typescript
minSimilarity: 0.3  // Score mínimo (0-1)
```

### Query Expansion

```typescript
expandQuery: true,
maxExpansionDepth: 2,
includeSubclasses: true,
includeSuperclasses: true,
includeInstances: true
```

### Razonamiento

Edita `src/config/reasoner.config.ts`:

```typescript
defaultReasoningLevel: ReasoningLevel.OWL_LITE,
autoReason: true,
maxIterations: 100,
maxInferredTriplesPerDocument: 500000
```

**Niveles disponibles:**
- `NONE`: Sin razonamiento
- `RDFS`: Solo reglas RDFS
- `OWL_LITE`: RDFS + OWL básico
- `OWL_DL`: Razonamiento completo

---

## 📊 API Endpoints

### Ontologías OWL

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/owl/upload` | Subir y parsear ontología |
| `GET` | `/owl` | Listar todas las ontologías |
| `GET` | `/owl/:id` | Información de una ontología |
| `GET` | `/owl/:id/stats` | Estadísticas detalladas |
| `DELETE` | `/owl/:id` | Eliminar ontología |

### Búsqueda Semántica

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/search` | Búsqueda semántica |
| `GET` | `/search/suggest` | Autocompletado |
| `GET` | `/search/related/:iri` | Conceptos relacionados |
| `POST` | `/search/cache/clear` | Limpiar cache |

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Tests unitarios
npm run test

# Tests E2E
npm run test:e2e

# Coverage
npm run test:cov
```

### Archivo de Prueba

Se incluye `test-data/ejemplo.owl` con:
- 3 clases: `Persona`, `Empleado`, `Organizacion`
- 3 propiedades: `trabajaEn`, `nombre`, `edad`
- 2 individuos: `Juan`, `TechCorp`

---

## 🛠️ Tecnologías

- **Backend**: NestJS 11
- **Base de Datos**: PostgreSQL + Prisma ORM
- **Parser RDF**: N3.js
- **Similitud**: natural, string-similarity, fastest-levenshtein
- **Documentación**: Swagger/OpenAPI
- **Validación**: class-validator, class-transformer

---

## 📈 Performance

### Optimizaciones Implementadas

- ✅ Cache de búsquedas (configurable)
- ✅ Cache de jerarquías de clases
- ✅ Índices en PostgreSQL para triplas
- ✅ Batch insert de inferencias
- ✅ Lazy loading de conceptos

### Benchmarks

Con una ontología de ~1000 triplas:
- **Upload + Parsing**: ~2-3 segundos
- **Razonamiento**: ~1-2 segundos
- **Búsqueda**: ~50-100ms (primera vez)
- **Búsqueda**: ~5-10ms (con cache)

---

## 🤝 Contribuir

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Roadmap

### Próximas Funcionalidades

- [ ] Soporte para SPARQL queries
- [ ] Visualización de ontologías (grafo)
- [ ] Frontend web para búsqueda
- [ ] Exportación de resultados (JSON, CSV)
- [ ] Integración con Elasticsearch
- [ ] GraphQL API
- [ ] Soporte para múltiples idiomas
- [ ] Machine Learning para ranking

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

---

## 👤 Autor

**Garcia BJ**

- GitHub: [@garcia-bj](https://github.com/garcia-bj)
- Proyecto: [semantic-searcher](https://github.com/garcia-bj/semantic-searcher)

---

## 🙏 Agradecimientos

- [NestJS](https://nestjs.com/) - Framework backend
- [N3.js](https://github.com/rdfjs/N3.js) - Parser RDF
- [Prisma](https://www.prisma.io/) - ORM
- [Railway](https://railway.app/) - Hosting PostgreSQL

---

## 📞 Soporte

Si tienes preguntas o problemas:

1. Revisa la [documentación de Swagger](http://localhost:3000/api)
2. Abre un [Issue](https://github.com/garcia-bj/semantic-searcher/issues)
3. Consulta los ejemplos en `test-data/`

---

**¡Feliz búsqueda semántica! 🚀**
