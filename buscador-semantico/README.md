# Buscador Semántico API

API REST desarrollada con NestJS y Prisma para búsqueda semántica de documentos.

## 🚀 Características

- **NestJS**: Framework Node.js progresivo
- **Prisma**: ORM moderno para PostgreSQL
- **Swagger**: Documentación automática de la API en `/api`
- **Railway**: Base de datos PostgreSQL en la nube
- **TypeScript**: Tipado estático
- **Validación**: DTOs con class-validator
- **CORS**: Habilitado para peticiones cross-origin

## 📋 Requisitos

- Node.js 18+
- npm
- Cuenta de Railway (para base de datos PostgreSQL)

## ⚙️ Instalación

```bash
# Instalar dependencias
npm install

# Generar cliente de Prisma
npx prisma generate

# Aplicar migraciones a la base de datos
npx prisma db push
```

## 🔧 Configuración

El archivo `.env` ya está configurado con:

```env
DATABASE_URL=postgresql://postgres:password@host:port/database
PORT=5000
```

## 🏃‍♂️ Ejecución

```bash
# Desarrollo con hot-reload
npm run start:dev

# Modo producción
npm run build
npm run start:prod
```

## 📚 Documentación API (Swagger)

Una vez iniciado el servidor, accede a la documentación interactiva en:

```
http://localhost:5000/api
```

Swagger te permite:
- Ver todos los endpoints disponibles
- Probar las peticiones directamente desde el navegador
- Ver los esquemas de datos y validaciones

## 🗃️ Base de Datos

### Ver datos con Prisma Studio

```bash
npx prisma studio
```

### Migrar cambios del esquema

```bash
npx prisma db push
```

### Generar migraciones

```bash
npx prisma migrate dev --name nombre_de_la_migracion
```

## 📁 Estructura del Proyecto

```
src/
├── config/
│   └── env.ts           # Validación de variables de entorno
├── prisma/
│   ├── prisma.module.ts # Módulo global de Prisma
│   └── prisma.service.ts # Servicio de conexión a BD
├── app.module.ts        # Módulo principal
├── app.controller.ts    # Controlador principal
├── app.service.ts       # Servicio principal
└── main.ts              # Punto de entrada + config Swagger

prisma/
└── schema.prisma        # Esquema de la base de datos
```

## 🛠️ Scripts Disponibles

```bash
npm run start        # Inicia la aplicación
npm run start:dev    # Modo desarrollo con hot-reload
npm run start:prod   # Modo producción
npm run build        # Compila el proyecto
npm run lint         # Ejecuta ESLint
npm run format       # Formatea código con Prettier
npm run test         # Ejecuta tests unitarios
npm run test:e2e     # Ejecuta tests end-to-end
npm run test:cov     # Ejecuta tests con cobertura
```

## 🔗 Tecnologías Principales

- [NestJS](https://nestjs.com/) - Framework backend
- [Prisma](https://www.prisma.io/) - ORM
- [PostgreSQL](https://www.postgresql.org/) - Base de datos
- [Swagger](https://swagger.io/) - Documentación API
- [Railway](https://railway.app/) - Hosting de base de datos
- [TypeScript](https://www.typescriptlang.org/) - Lenguaje
- [class-validator](https://github.com/typestack/class-validator) - Validación
- [Zod](https://zod.dev/) - Validación de env vars

## 📝 Licencia

UNLICENSED
