# services/ — Per-Service Specs

Detailed specs for individual microservices. The catalog and the events/API conventions live in [../08-services-catalog.md](../08-services-catalog.md) and [../19-api-standards.md](../19-api-standards.md). Each service spec follows the same template:

> **Responsibility · Tech · Data owned · API (sync) · Events (produced/consumed) · Dependencies · Scaling · Failure modes & degradation · Security notes**

Specs in this folder (others follow the catalog; add a file here as each is built):

- [auth-service.md](./auth-service.md)
- [access-service.md](./access-service.md)
- [ai-gateway-service.md](./ai-gateway-service.md)
- [document-service.md](./document-service.md)
- [ocr-service.md](./ocr-service.md)
- [reconciliation-service.md](./reconciliation-service.md)
- [whatsapp-service.md](./whatsapp-service.md)

Every service also ships its own `README.md` in code linking back to its spec here.
