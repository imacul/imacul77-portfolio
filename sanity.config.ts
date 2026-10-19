import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
export default defineConfig({
 name:'default',title:'IMACUL77 Portfolio',projectId:'597y0bha',dataset:'production',
 basePath:'/admin',
 plugins:[structureTool(),visionTool()],
 schema:{types:schemaTypes}
})
