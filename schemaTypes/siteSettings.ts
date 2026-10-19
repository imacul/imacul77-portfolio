import {defineType,defineField} from 'sanity'
const text=(name:string,title:string)=>defineField({name,title,type:'text',rows:2})
const str=(name:string,title:string)=>defineField({name,title,type:'string'})
const group=(name:string,title:string,fields:any[])=>defineField({name,title,type:'object',fields})
export const siteSettings=defineType({
 name:'siteSettings',title:'Site Content & Settings',type:'document',
 fields:[
 str('brand','Brand'),
 group('seo','SEO',[str('title','Browser title'),text('description','Search description')]),
 group('hero','Gallery hero',[str('heading','Heading')]),
 group('entry','Welcome screen',[str('heading','Heading'),str('emphasis','Emphasis'),text('copy','Description'),str('sound','Sound button'),str('silent','Silent button'),str('footnote','Footnote')]),
 group('about','About',[str('kicker','Kicker'),str('heading','Heading (allows <br> and <em>)'),text('copy','Description'),str('button','Button text')]),
 group('footer','Contact & footer',[str('kicker','Kicker'),str('heading','Heading'),str('emphasis','Emphasis'),str('email','Email label'),str('emailUrl','Email link'),str('socialLabel','Social label'),str('socialUrl','Social URL'),str('copyright','Copyright name'),str('services','Services'),str('back','Back link')]),
 group('ui','Navigation & interface',[
 str('index','Index label'),str('projects','Projects label'),str('contact','Contact label'),str('all','All filter'),str('frontend','Frontend filter'),str('fullstack','Fullstack filter'),str('mobile','Mobile filter'),str('scroll','Scroll hint'),str('menuEmail','Menu email'),str('menuEmailUrl','Menu email URL')
 ]),
 defineField({name:'audioFile',title:'Upload ambient audio',type:'file'}),
 defineField({name:'audioUrl',title:'Ambient audio URL (fallback)',type:'url'}),
 defineField({name:'brandIconFile',title:'Upload brand icon (SVG supported)',type:'file'}),
 defineField({name:'brandIconUrl',title:'Brand icon URL (fallback)',type:'url'})
 ],
 preview:{select:{title:'brand'}}
})
