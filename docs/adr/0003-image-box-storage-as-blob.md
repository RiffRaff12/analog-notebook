# ADR 0003: Image Box Storage as Blob in IndexedDB

**Status:** Accepted

## Context

Image Boxes must be persisted client-side alongside Text Boxes. IndexedDB (the existing storage layer) supports two practical approaches for image data: storing raw binary as a `Blob`, or converting the image to a base64-encoded string and storing it as text.

## Decision

Store image data as a native `Blob` in IndexedDB.

## Consequences

Blobs are stored as binary in IndexedDB with no encoding overhead — base64 inflates size by ~33%, which compounds quickly when a spread contains multiple photos. Blob reads are also faster since no decode step is required before rendering via `URL.createObjectURL`.

The trade-off is that Blobs cannot be serialised to JSON directly. Any future export or sync feature would need to convert them at that boundary. This is acceptable: the app is currently client-only with no export or backend.

## Alternatives Considered

**Base64 strings:** Simpler to serialise and widely used in browser apps that deal with JSON APIs. Rejected because the storage inflation is meaningful for an offline-first app with no size budget from a server, and IndexedDB has first-class Blob support that makes the complexity argument weak.
