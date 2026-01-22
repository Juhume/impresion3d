/**
 * Script para migrar productos del JSON local a Firestore
 *
 * Uso:
 * npx tsx scripts/migrateProducts.ts
 *
 * Requiere:
 * - Tener configuradas las variables de entorno de Firebase
 * - O usar una service account
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Configuración - EDITAR ESTOS VALORES
const PROJECT_ID = 'TU-PROJECT-ID'; // Cambiar por tu project ID

// Opción 1: Usar service account (recomendado)
// Descarga el archivo JSON desde Firebase Console > Project Settings > Service accounts
// const serviceAccount = require('./serviceAccountKey.json');

// Opción 2: Usar Application Default Credentials
// Ejecutar primero: gcloud auth application-default login

async function migrate() {
  console.log('Iniciando migración de productos...\n');

  // Inicializar Firebase Admin
  // Opción 1: Con service account
  // initializeApp({
  //   credential: cert(serviceAccount as ServiceAccount),
  //   projectId: PROJECT_ID,
  // });

  // Opción 2: Con ADC (Application Default Credentials)
  initializeApp({
    projectId: PROJECT_ID,
  });

  const db = getFirestore();

  // Leer productos del JSON
  const productosPath = join(__dirname, '../src/data/productos.json');
  const productosJson = readFileSync(productosPath, 'utf-8');
  const productos = JSON.parse(productosJson);

  console.log(`Encontrados ${productos.length} productos para migrar\n`);

  // Migrar cada producto
  for (const producto of productos) {
    try {
      // Preparar datos para Firestore
      const productData = {
        nombre: producto.nombre,
        slug: producto.slug,
        descripcion: producto.descripcion || '',
        descripcionCorta: producto.descripcionCorta || '',
        precio: producto.precio,
        precioOferta: producto.precioOferta || null,
        categoria: producto.categoria,
        subcategoria: producto.subcategoria || '',
        stock: producto.stock || 10,
        activo: true,
        destacado: producto.destacado || false,
        imagenPrincipal: producto.imagenPrincipal || (producto.imagenes?.[0]?.url) || '',
        imagenes: producto.imagenes || [],
        caracteristicas: producto.caracteristicas || [],
        materiales: producto.materiales || [],
        dimensiones: producto.dimensiones || '',
        peso: producto.peso || '',
        tiempoImpresion: producto.tiempoImpresion || '',
        metaTitle: producto.metaTitle || producto.nombre,
        metaDescription: producto.metaDescription || producto.descripcionCorta || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Usar el slug como ID del documento
      await db.collection('products').doc(producto.slug).set(productData);
      console.log(`✓ Migrado: ${producto.nombre}`);
    } catch (error) {
      console.error(`✗ Error migrando ${producto.nombre}:`, error);
    }
  }

  console.log('\n¡Migración completada!');
}

migrate().catch(console.error);
