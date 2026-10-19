import {defineType,defineField} from 'sanity'
export const portfolioProject=defineType({
 name:'portfolioProject',title:'Portfolio Projects',type:'document',
 fields:[
 defineField({name:'name',title:'Name',type:'string',validation:r=>r.required()}),
 defineField({name:'description',title:'Description',type:'text',rows:2}),
 defineField({name:'category',title:'Category',type:'string',options:{list:[{title:'Frontend',value:'frontend'},{title:'Fullstack',value:'fullstack'},{title:'Mobile',value:'mobile'}]},validation:r=>r.required()}),
 defineField({name:'href',title:'Project link',type:'url'}),
 defineField({name:'image',title:'Project image (Sanity upload)',type:'image',options:{hotspot:true}}),
 defineField({name:'imageUrl',title:'Legacy image URL (optional)',type:'string',description:'Used until a Sanity image is uploaded.'}),
 defineField({name:'color',title:'Background hex color',type:'string'}),
 defineField({name:'order',title:'Display order',type:'number',validation:r=>r.required().integer().min(0)})
 ],
 preview:{select:{title:'name',subtitle:'category',media:'image'}}
})
