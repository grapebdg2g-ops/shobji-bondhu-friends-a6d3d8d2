// src/data/master-crop-data.ts
// Source: BRRI, BARI, AIS, DAE Bangladesh
// Single source of truth for ALL features

import papayaIcon from '@/assets/crops/papaya.webp'
import cauliflowerIcon from '@/assets/crops/fulkopi.webp'
import okraIcon from '@/assets/crops/dheros.webp'
import bitterGourdIcon from '@/assets/crops/korola.webp'
import bottleGourdIcon from '@/assets/crops/lau.webp'
import pointedGourdIcon from '@/assets/crops/potol.webp'
import beanIcon from '@/assets/crops/shim.webp'
import yardlongBeanIcon from '@/assets/crops/borboti.webp'
import mustardIcon from '@/assets/crops/shorisha.webp'
import sesameIcon from '@/assets/crops/til.webp'
import turmericIcon from '@/assets/crops/holud.webp'
import wheatIcon from '@/assets/crops/gom.webp'

// ══════════════════════════════════════
// TYPE DEFINITIONS
// ══════════════════════════════════════

export type Season = 'রবি' | 'খরিফ-১' | 'খরিফ-২' | 'সারা বছর'
export type SoilType = 'এঁটেল' | 'দোআঁশ' | 'বালি' | 'পলি' | 'বেলে-দোআঁশ'
export type WaterNeed = 'কম' | 'মাঝারি' | 'বেশি'
export type RiskLevel = 'কম' | 'মাঝারি' | 'বেশি'
export type Category = 'ধান্য' | 'সবজি' | 'মসলা' | 'তেল' | 'কন্দাল'

export interface Variety {
  name: string
  type: 'উফশী' | 'হাইব্রিড' | 'স্থানীয়'
  daysToHarvest: number
  yieldPerBigha: number
  special?: string
}

export interface Stage {
  id: string
  name: string
  icon: string
  startDay: number
  endDay: number
  tasks: Task[]
}

export interface Task {
  title: string
  desc: string
  type: 'preparation' | 'task' | 'fertilizer' |
        'irrigation' | 'disease' | 'pest' |
        'harvest' | 'post-harvest'
  urgency: 'সাধারণ' | 'জরুরি' | 'অত্যন্ত জরুরি'
  timing?: string
}

export interface FertilizerSchedule {
  perBigha: Record<string, number>
  soilAdjustment: Record<SoilType, Record<string, number>>
  schedule: {
    timing: string
    items: string[]
    note: string
  }[]
  warnings: string[]
}

export interface CalendarEvent {
  month: number
  type: 'planting' | 'fertilizer' | 'harvest' |
        'irrigation' | 'warning'
  title: string
  desc: string
}

export interface CropData {
  id: string
  name: string
  nameEn: string
  icon: string
  iconImage?: string
  category: Category
  seasons: Season[]
  plantingMonths: number[]
  harvestMonths: number[]
  totalDays: number
  soilTypes: SoilType[]
  waterRequirement: WaterNeed
  irrigationNeeded: boolean
  phRange: { min: number; max: number }
  seedCostPerBigha: number
  fertilizerCost: number
  pesticideCost: number
  laborCost: number
  otherCost: number
  get totalCost(): number
  yieldMin: number
  yieldMax: number
  avgMarketPrice: number
  get profitMin(): number
  get profitMax(): number
  get roi(): number
  riskLevel: RiskLevel
  riskFactors: string[]
  varieties: Variety[]
  stages: Stage[]
  fertilizerGuide: FertilizerSchedule
  calendarEvents: CalendarEvent[]
  bestSellingMonths: number[]
  demandLevel: 'কম' | 'মাঝারি' | 'বেশি'
  exportPotential: boolean
  goodCompanions: string[]
  badCompanions: string[]
  govtSupport: string[]
  tips: string[]
}

// ══════════════════════════════════════
// MASTER CROP DATABASE
// ══════════════════════════════════════

export const CROPS: Record<string, CropData> = {

  // ════════════════════════════════════
  // ১. বোরো ধান
  // Source: BRRI
  // ════════════════════════════════════
  'boro-dhan': {
    id: 'boro-dhan',
    name: 'বোরো ধান',
    nameEn: 'Boro Rice',
    icon: '🌾',
    category: 'ধান্য',
    seasons: ['রবি'],
    plantingMonths: [12, 1],
    harvestMonths: [4, 5],
    totalDays: 145,
    soilTypes: ['এঁটেল', 'দোআঁশ', 'পলি'],
    waterRequirement: 'বেশি',
    irrigationNeeded: true,
    phRange: { min: 5.5, max: 7.0 },
    seedCostPerBigha: 800,
    fertilizerCost: 2500,
    pesticideCost: 1500,
    laborCost: 6000,
    otherCost: 1200,
    get totalCost() {
      return this.seedCostPerBigha + this.fertilizerCost +
             this.pesticideCost + this.laborCost + this.otherCost
    },
    yieldMin: 30,
    yieldMax: 45,
    avgMarketPrice: 800,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'মাঝারি',
    riskFactors: [
      'ব্লাস্ট রোগের ঝুঁকি বেশি',
      'সেচের পানির নির্ভরতা বেশি',
      'বাদামি গাছফড়িং মারাত্মক ক্ষতি করে'
    ],
    varieties: [
      { name: 'BRRI dhan28', type: 'উফশী', daysToHarvest: 140, yieldPerBigha: 35, special: 'আগাম জাত' },
      { name: 'BRRI dhan29', type: 'উফশী', daysToHarvest: 148, yieldPerBigha: 42, special: 'সর্বোচ্চ ফলন' },
      { name: 'BRRI dhan58', type: 'উফশী', daysToHarvest: 145, yieldPerBigha: 40, special: 'জিঙ্কসমৃদ্ধ' },
      { name: 'BRRI dhan74', type: 'উফশী', daysToHarvest: 143, yieldPerBigha: 38, special: 'লবণ সহিষ্ণু' },
    ],
    stages: [
      {
        id: 'seedbed', name: 'বীজতলা', icon: '🌱',
        startDay: 0, endDay: 30,
        tasks: [
          { title: 'বীজ শোধন', type: 'preparation', urgency: 'জরুরি',
            desc: 'কার্বেনডাজিম দিয়ে বীজ শোধন করুন। পুষ্ট বীজ বাছাই করুন।' },
          { title: 'বীজতলা প্রস্তুত', type: 'preparation', urgency: 'জরুরি',
            desc: 'বিঘায় ১ কাঠা বীজতলা। নভেম্বর-ডিসেম্বরে করুন।' },
          { title: 'থ্রিপস দমন', type: 'pest', urgency: 'সাধারণ',
            desc: 'থ্রিপস দেখলে মেলাথিয়ন ১৩৩ মিলি/১০ লিটার পানিতে স্প্রে।' },
        ]
      },
      {
        id: 'transplanting', name: 'চারা রোপণ', icon: '🚜',
        startDay: 30, endDay: 45,
        tasks: [
          { title: 'জমি তৈরি', type: 'preparation', urgency: 'জরুরি',
            desc: '৪-৫ চাষ ও মই। শেষ চাষে TSP, MOP, Gypsum, Zinc দিন।' },
          { title: 'চারা রোপণ', type: 'task', urgency: 'অত্যন্ত জরুরি',
            desc: '২৫-৩০ দিনের চারা। সারি ২০×১৫ সেমি। গুছিতে ২-৩টি।' },
          { title: 'পাখির ডাল', type: 'pest', urgency: 'সাধারণ',
            desc: 'জমিতে ডালপালা পুঁতুন — পাখি পোকা খাবে।' },
        ]
      },
      {
        id: 'vegetative', name: 'গাছের বৃদ্ধি', icon: '🌿',
        startDay: 45, endDay: 90,
        tasks: [
          { title: 'ইউরিয়া ১ম কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'রোপণের ৭-১০ দিন পর',
            desc: 'ছিপছিপে পানিতে দিন। ২-৩ দিন পানি বন্ধ।' },
          { title: 'আগাছা দমন', type: 'task', urgency: 'জরুরি',
            desc: 'রোপণের ১৫-২০ দিন পর নিড়ানি। উইডার বা হাতে।' },
          { title: 'AWD সেচ', type: 'irrigation', urgency: 'সাধারণ',
            desc: 'পানি শুকালে ৩-৫ সেমি দিন। পানি সাশ্রয় হবে ৩০%।' },
          { title: 'ইউরিয়া ২য় কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'রোপণের ২৫-৩০ দিন পর',
            desc: 'কুশি বাড়ার সময়। মোট ইউরিয়ার ১/৩ অংশ।' },
          { title: 'মাজরা পোকা দমন', type: 'pest', urgency: 'জরুরি',
            desc: 'ডেড হার্ট দেখলে কার্টাপ। ফেরোমন ফাঁদ ব্যবহার করুন।' },
        ]
      },
      {
        id: 'panicle', name: 'থোড় আসার সময়', icon: '🌾',
        startDay: 90, endDay: 115,
        tasks: [
          { title: 'ইউরিয়া ৩য় কিস্তি', type: 'fertilizer', urgency: 'অত্যন্ত জরুরি',
            timing: 'থোড় আসার ৭-১০ দিন আগে',
            desc: 'সবচেয়ে গুরুত্বপূর্ণ কিস্তি — এড়িয়ে যাবেন না।' },
          { title: 'ব্লাস্ট রোগ দমন', type: 'disease', urgency: 'অত্যন্ত জরুরি',
            desc: 'ধূসর ডায়মন্ড দাগ দেখলে ট্রাইসাইক্লাজোল দিন। ঠান্ডায় সতর্ক।' },
          { title: 'সেচ নিশ্চিত', type: 'irrigation', urgency: 'অত্যন্ত জরুরি',
            desc: 'থোড় ও ফুলের সময় পানি অবশ্যই রাখুন।' },
        ]
      },
      {
        id: 'ripening', name: 'ধান পাকা', icon: '🌟',
        startDay: 115, endDay: 140,
        tasks: [
          { title: 'পানি বের করুন', type: 'irrigation', urgency: 'জরুরি',
            timing: 'পাকার ১০-১৫ দিন আগে',
            desc: 'জমি শুকালে মাড়াই সহজ হবে।' },
          { title: 'বাদামি গাছফড়িং', type: 'pest', urgency: 'অত্যন্ত জরুরি',
            desc: 'গোড়া দেখুন। ক্লোথিয়ানিডিন বা কার্বোসালফান দিন।' },
        ]
      },
      {
        id: 'harvest-rice', name: 'ধান কাটা', icon: '🧺',
        startDay: 140, endDay: 150,
        tasks: [
          { title: 'ধান কাটা', type: 'harvest', urgency: 'জরুরি',
            desc: '৮০% ধান সোনালি হলে কাটুন। সকালে কাটা ভালো।' },
          { title: 'মাড়াই ও শুকানো', type: 'post-harvest', urgency: 'জরুরি',
            desc: 'আর্দ্রতা ১৪% এর নিচে শুকান। ভেজা রাখলে পচে।' },
        ]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 20, tsp: 7, mop: 11, gypsum: 8, zinc: 1.5 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.85 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.25, tsp: 1.15 },
        'পলি':   { urea: 0.85, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.1, tsp: 1.05 },
      },
      schedule: [
        { timing: 'শেষ চাষে', items: ['TSP সম্পূর্ণ', 'MOP সম্পূর্ণ', 'Gypsum', 'Zinc'], note: '' },
        { timing: 'রোপণের ৭-১০ দিন পর', items: ['Urea ১/৩'], note: '১ম কিস্তি' },
        { timing: 'রোপণের ২৫-৩০ দিন পর', items: ['Urea ১/৩'], note: '২য় কিস্তি' },
        { timing: 'থোড় আসার আগে', items: ['Urea ১/৩'], note: '৩য় কিস্তি — সবচেয়ে গুরুত্বপূর্ণ' },
      ],
      warnings: ['পানিতে ইউরিয়া দেবেন না', 'ব্লাস্ট দেখলে ইউরিয়া বন্ধ করুন'],
    },
    calendarEvents: [
      { month: 11, type: 'planting', title: 'বীজতলা', desc: 'নভেম্বরে বীজতলা করুন' },
      { month: 12, type: 'planting', title: 'চারা রোপণ', desc: 'ডিসেম্বর-জানুয়ারিতে রোপণ' },
      { month: 2, type: 'fertilizer', title: 'ইউরিয়া ৩য় কিস্তি', desc: 'ফেব্রুয়ারিতে থোড়ের আগে' },
      { month: 4, type: 'harvest', title: 'ধান কাটা', desc: 'এপ্রিল-মে মাসে কাটুন' },
    ],
    bestSellingMonths: [5, 6],
    demandLevel: 'বেশি',
    exportPotential: false,
    goodCompanions: ['মসুর ডাল (ফসলের পর)'],
    badCompanions: [],
    govtSupport: ['সার ভর্তুকি', 'ধান ক্রয় কেন্দ্র'],
    tips: [
      'BRRI dhan29 সবচেয়ে বেশি ফলন দেয়',
      'AWD পদ্ধতিতে পানি ৩০% সাশ্রয় হয়',
      'সময়মতো ব্লাস্ট দমন না করলে ৫০% ফলন কমতে পারে',
    ],
  },

  // ════════════════════════════════════
  // ২. আমন ধান
  // ════════════════════════════════════
  'aman-dhan': {
    id: 'aman-dhan',
    name: 'আমন ধান',
    nameEn: 'Aman Rice',
    icon: '🌾',
    category: 'ধান্য',
    seasons: ['খরিফ-২'],
    plantingMonths: [7, 8],
    harvestMonths: [11, 12],
    totalDays: 130,
    soilTypes: ['এঁটেল', 'দোআঁশ', 'পলি'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: false,
    phRange: { min: 5.5, max: 7.0 },
    seedCostPerBigha: 600,
    fertilizerCost: 1800,
    pesticideCost: 1000,
    laborCost: 5000,
    otherCost: 800,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 20,
    yieldMax: 32,
    avgMarketPrice: 850,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['বন্যার ঝুঁকি', 'ঘূর্ণিঝড়ের সময় ফসল ক্ষতি'],
    varieties: [
      { name: 'BRRI dhan49', type: 'উফশী', daysToHarvest: 128, yieldPerBigha: 28, special: 'বন্যা সহিষ্ণু' },
      { name: 'BRRI dhan51', type: 'উফশী', daysToHarvest: 118, yieldPerBigha: 25, special: 'আগাম' },
      { name: 'বিনা ধান-৭', type: 'উফশী', daysToHarvest: 115, yieldPerBigha: 24 },
    ],
    stages: [
      { id: 'seedbed', name: 'বীজতলা', icon: '🌱', startDay: 0, endDay: 25,
        tasks: [
          { title: 'আষাঢ়ে বীজতলা', type: 'preparation', urgency: 'জরুরি',
            desc: 'জুন-জুলাই মাসে বীজতলা তৈরি করুন।' },
        ]
      },
      { id: 'transplanting', name: 'রোপণ', icon: '🚜', startDay: 25, endDay: 40,
        tasks: [
          { title: 'রোপণ', type: 'task', urgency: 'অত্যন্ত জরুরি',
            desc: '২০-২৫ দিনের চারা রোপণ। জুলাই-আগস্টে।' },
          { title: 'বেসাল সার', type: 'fertilizer', urgency: 'জরুরি',
            desc: 'TSP, MOP, Gypsum শেষ চাষে দিন।' },
        ]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 40, endDay: 90,
        tasks: [
          { title: 'ইউরিয়া ১ম কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'রোপণের ১৫-২০ দিন পর', desc: 'বৃষ্টির আগে দেবেন না।' },
          { title: 'ইউরিয়া ২য় কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'রোপণের ৩৫-৪০ দিন পর', desc: 'কুশি আসার সময়।' },
        ]
      },
      { id: 'harvest-aman', name: 'ধান কাটা', icon: '🧺', startDay: 115, endDay: 130,
        tasks: [
          { title: 'ধান কাটা', type: 'harvest', urgency: 'জরুরি',
            desc: 'নভেম্বর-ডিসেম্বরে কাটুন।' },
        ]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 16, tsp: 5, mop: 8, gypsum: 5, zinc: 1.0 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.85 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.2, tsp: 1.1 },
        'পলি':   { urea: 0.85, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.05, tsp: 1.0 },
      },
      schedule: [
        { timing: 'শেষ চাষে', items: ['TSP', 'MOP', 'Gypsum', 'Zinc'], note: '' },
        { timing: 'রোপণের ১৫-২০ দিন পর', items: ['Urea ১/২'], note: '১ম কিস্তি' },
        { timing: 'রোপণের ৩৫-৪০ দিন পর', items: ['Urea ১/২'], note: '২য় কিস্তি' },
      ],
      warnings: ['বৃষ্টির আগে ইউরিয়া দেবেন না'],
    },
    calendarEvents: [
      { month: 6, type: 'planting', title: 'বীজতলা', desc: 'জুন-জুলাইয়ে বীজতলা' },
      { month: 8, type: 'planting', title: 'রোপণ', desc: 'জুলাই-আগস্টে রোপণ' },
      { month: 11, type: 'harvest', title: 'ধান কাটা', desc: 'নভেম্বর-ডিসেম্বরে' },
    ],
    bestSellingMonths: [12, 1],
    demandLevel: 'বেশি',
    exportPotential: false,
    goodCompanions: [],
    badCompanions: [],
    govtSupport: ['সার ভর্তুকি', 'বীজ সহায়তা'],
    tips: ['বন্যাপ্রবণ এলাকায় BRRI dhan49 দিন', 'বৃষ্টির উপর নির্ভর করে চাষ হয় — সেচ খরচ কম'],
  },

  // ════════════════════════════════════
  // ৩. আউশ ধান
  // ════════════════════════════════════
  'aus-dhan': {
    id: 'aus-dhan',
    name: 'আউশ ধান',
    nameEn: 'Aus Rice',
    icon: '🌾',
    category: 'ধান্য',
    seasons: ['খরিফ-১'],
    plantingMonths: [4, 5],
    harvestMonths: [8, 9],
    totalDays: 100,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ', 'পলি'],
    waterRequirement: 'কম',
    irrigationNeeded: false,
    phRange: { min: 5.5, max: 6.5 },
    seedCostPerBigha: 500,
    fertilizerCost: 1500,
    pesticideCost: 800,
    laborCost: 4500,
    otherCost: 700,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 15,
    yieldMax: 22,
    avgMarketPrice: 850,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['ফলন কম', 'খরার ঝুঁকি'],
    varieties: [
      { name: 'BRRI dhan43', type: 'উফশী', daysToHarvest: 95, yieldPerBigha: 20 },
      { name: 'BRRI dhan55', type: 'উফশী', daysToHarvest: 100, yieldPerBigha: 22, special: 'খরা সহিষ্ণু' },
    ],
    stages: [
      { id: 'sowing', name: 'বপন', icon: '🌱', startDay: 0, endDay: 20,
        tasks: [
          { title: 'সরাসরি বপন', type: 'task', urgency: 'জরুরি',
            desc: 'এপ্রিল-মে মাসে সরাসরি জমিতে বপন। চারা লাগাতে হয় না।' },
        ]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 20, endDay: 70,
        tasks: [
          { title: 'ইউরিয়া ১ম কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'বপনের ১৫ দিন পর', desc: 'মোট ইউরিয়ার ১/২ অংশ।' },
          { title: 'ইউরিয়া ২য় কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'বপনের ৩০ দিন পর', desc: 'বাকি ১/২ অংশ।' },
        ]
      },
      { id: 'harvest-aus', name: 'কাটা', icon: '🧺', startDay: 90, endDay: 100,
        tasks: [
          { title: 'ধান কাটা', type: 'harvest', urgency: 'জরুরি',
            desc: 'আগস্ট-সেপ্টেম্বরে কাটুন।' },
        ]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 13, tsp: 4, mop: 6, gypsum: 4, zinc: 0.8 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.15, tsp: 1.1 },
        'পলি':   { urea: 0.85, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.05, tsp: 1.0 },
      },
      schedule: [
        { timing: 'শেষ চাষে', items: ['TSP', 'MOP', 'Gypsum'], note: '' },
        { timing: 'বপনের ১৫ দিন পর', items: ['Urea ১/২'], note: '' },
        { timing: 'বপনের ৩০ দিন পর', items: ['Urea ১/২'], note: '' },
      ],
      warnings: ['আউশে বেশি সার দিলে গাছ হেলে পড়ে'],
    },
    calendarEvents: [
      { month: 4, type: 'planting', title: 'বপন', desc: 'এপ্রিল-মে মাসে বপন' },
      { month: 8, type: 'harvest', title: 'কাটা', desc: 'আগস্ট-সেপ্টেম্বরে' },
    ],
    bestSellingMonths: [9, 10],
    demandLevel: 'মাঝারি',
    exportPotential: false,
    goodCompanions: [],
    badCompanions: [],
    govtSupport: ['সার ভর্তুকি'],
    tips: ['আউশ দ্রুত হয় — ১০০ দিনে ফসল', 'খরচ সবচেয়ে কম'],
  },

  // ════════════════════════════════════
  // ৪. গম
  // Source: BWMRI
  // ════════════════════════════════════
  'gom': {
    id: 'gom',
    name: 'গম',
    nameEn: 'Wheat',
    icon: '🌾',
    iconImage: wheatIcon,
    category: 'ধান্য',
    seasons: ['রবি'],
    plantingMonths: [11, 12],
    harvestMonths: [3, 4],
    totalDays: 115,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ', 'এঁটেল'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.5 },
    seedCostPerBigha: 1000,
    fertilizerCost: 2200,
    pesticideCost: 1200,
    laborCost: 4500,
    otherCost: 800,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 15,
    yieldMax: 22,
    avgMarketPrice: 1100,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'মাঝারি',
    riskFactors: ['ব্লাস্ট রোগ (wheat blast)', 'দেরিতে বপনে ফলন কমে'],
    varieties: [
      { name: 'বারি গম-২৬', type: 'উফশী', daysToHarvest: 108, yieldPerBigha: 20 },
      { name: 'বারি গম-৩২', type: 'উফশী', daysToHarvest: 110, yieldPerBigha: 22, special: 'ব্লাস্ট সহিষ্ণু' },
      { name: 'বিনা গম-১', type: 'উফশী', daysToHarvest: 100, yieldPerBigha: 18, special: 'আগাম' },
    ],
    stages: [
      { id: 'sowing', name: 'বপন', icon: '🌱', startDay: 0, endDay: 15,
        tasks: [
          { title: 'সময়মতো বপন', type: 'task', urgency: 'অত্যন্ত জরুরি',
            desc: 'নভেম্বর ১৫ থেকে ডিসেম্বর ১৫ এর মধ্যে বপন করুন। দেরি হলে ফলন কমে।' },
          { title: 'বেসাল সার', type: 'fertilizer', urgency: 'জরুরি',
            desc: 'TSP, MOP, Gypsum, Zinc, Boron বপনের সময় দিন।' },
        ]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 15, endDay: 60,
        tasks: [
          { title: 'CRI সেচ', type: 'irrigation', urgency: 'অত্যন্ত জরুরি',
            timing: 'বপনের ২৫-৩০ দিন পর',
            desc: '১ম সেচ — এটি সবচেয়ে গুরুত্বপূর্ণ সেচ।' },
          { title: 'ইউরিয়া ১ম কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: '১ম সেচের সাথে',
            desc: 'মোট ইউরিয়ার ১/৩ অংশ।' },
          { title: 'ইউরিয়া ২য় কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'বপনের ৪৫-৫০ দিন পর (২য় সেচের সাথে)',
            desc: 'Jointing stage এ।' },
        ]
      },
      { id: 'harvest-wheat', name: 'কাটা', icon: '🧺', startDay: 100, endDay: 115,
        tasks: [
          { title: 'গম কাটা', type: 'harvest', urgency: 'জরুরি',
            desc: 'মার্চ-এপ্রিলে কাটুন। সম্পূর্ণ পাকলেই কাটুন।' },
        ]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 18, tsp: 7, mop: 6, gypsum: 5, zinc: 1.0, boron: 0.5 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.15, tsp: 1.1 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.05, tsp: 1.0 },
      },
      schedule: [
        { timing: 'বপনের সময়', items: ['TSP', 'MOP', 'Gypsum', 'Zinc', 'Boron', 'Urea ১/৩'], note: 'Basal' },
        { timing: '১ম সেচের পর (২৫-৩০ দিন)', items: ['Urea ১/৩'], note: 'CRI stage' },
        { timing: '২য় সেচের পর (৪৫-৫০ দিন)', items: ['Urea ১/৩'], note: 'Jointing' },
      ],
      warnings: ['গমে Boron অবশ্যই দিন', 'Wheat Blast দেখলে আশেপাশের কৃষককে জানান'],
    },
    calendarEvents: [
      { month: 11, type: 'planting', title: 'গম বপন', desc: 'নভেম্বর ১৫ থেকে শুরু' },
      { month: 12, type: 'irrigation', title: 'CRI সেচ', desc: 'বপনের ২৫-৩০ দিন পর' },
      { month: 3, type: 'harvest', title: 'গম কাটা', desc: 'মার্চ-এপ্রিলে' },
    ],
    bestSellingMonths: [4, 5],
    demandLevel: 'বেশি',
    exportPotential: false,
    goodCompanions: ['মসুর ডাল', 'সরিষা (আগে)'],
    badCompanions: [],
    govtSupport: ['সার ভর্তুকি', 'গম ক্রয় কেন্দ্র', 'বীজ সহায়তা'],
    tips: ['সময়মতো বপন সবচেয়ে গুরুত্বপূর্ণ', 'Wheat Blast বাংলাদেশে নতুন ঝুঁকি — সতর্ক থাকুন'],
  },

  // ════════════════════════════════════
  // ৫. ভুট্টা
  // Source: BARI
  // ════════════════════════════════════
  'vutta': {
    id: 'vutta',
    name: 'ভুট্টা',
    nameEn: 'Maize',
    icon: '🌽',
    category: 'ধান্য',
    seasons: ['রবি', 'খরিফ-১'],
    plantingMonths: [10, 11, 3],
    harvestMonths: [3, 4, 7],
    totalDays: 110,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ', 'এঁটেল'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 5.8, max: 7.0 },
    seedCostPerBigha: 1500,
    fertilizerCost: 3500,
    pesticideCost: 1500,
    laborCost: 6000,
    otherCost: 1000,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 40,
    yieldMax: 60,
    avgMarketPrice: 700,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['Fall Armyworm (নতুন পোকা)', 'পানি জমলে ক্ষতি'],
    varieties: [
      { name: 'বারি ভুট্টা-৯', type: 'হাইব্রিড', daysToHarvest: 110, yieldPerBigha: 55, special: 'সর্বোচ্চ ফলন' },
      { name: 'বারি ভুট্টা-১২', type: 'হাইব্রিড', daysToHarvest: 105, yieldPerBigha: 50 },
      { name: 'NK-40', type: 'হাইব্রিড', daysToHarvest: 108, yieldPerBigha: 58 },
    ],
    stages: [
      { id: 'sowing', name: 'বপন', icon: '🌱', startDay: 0, endDay: 15,
        tasks: [
          { title: 'বপন', type: 'task', urgency: 'জরুরি',
            desc: 'অক্টোবর-নভেম্বরে বপন। সারিতে ৬০×২৫ সেমি দূরত্বে।' },
          { title: 'বেসাল সার', type: 'fertilizer', urgency: 'জরুরি',
            desc: 'TSP, MOP, Gypsum, Zinc বপনের সময় দিন।' },
        ]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 15, endDay: 70,
        tasks: [
          { title: 'ইউরিয়া ১ম কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'বপনের ২৫-৩০ দিন পর',
            desc: 'হাঁটু সমান হলে ১ম top dress।' },
          { title: 'Fall Armyworm দমন', type: 'pest', urgency: 'অত্যন্ত জরুরি',
            desc: 'পাতায় ছিদ্র দেখলে Emamectin benzoate দিন।' },
          { title: 'ইউরিয়া ২য় কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'বপনের ৪৫-৫০ দিন পর',
            desc: 'মোচা আসার আগে।' },
        ]
      },
      { id: 'harvest-maize', name: 'কাটা', icon: '🧺', startDay: 100, endDay: 110,
        tasks: [
          { title: 'ভুট্টা কাটা', type: 'harvest', urgency: 'জরুরি',
            desc: 'মার্চ-এপ্রিলে। শুকিয়ে মাড়াই করুন।' },
        ]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 27, tsp: 10, mop: 11, gypsum: 7, zinc: 1.5 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.2, tsp: 1.15 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.05, tsp: 1.0 },
      },
      schedule: [
        { timing: 'বপনের সময়', items: ['TSP', 'MOP ১/২', 'Gypsum', 'Zinc', 'Urea ১/৩'], note: 'Basal' },
        { timing: 'বপনের ২৫-৩০ দিন পর', items: ['Urea ১/৩', 'MOP ১/২'], note: '১ম top dress' },
        { timing: 'বপনের ৪৫-৫০ দিন পর', items: ['Urea ১/৩'], note: '২য় top dress' },
      ],
      warnings: ['ভুট্টায় সবচেয়ে বেশি ইউরিয়া লাগে', 'Fall Armyworm নতুন ঝুঁকি'],
    },
    calendarEvents: [
      { month: 10, type: 'planting', title: 'ভুট্টা বপন', desc: 'অক্টোবর-নভেম্বরে' },
      { month: 3, type: 'harvest', title: 'ভুট্টা কাটা', desc: 'মার্চ-এপ্রিলে' },
    ],
    bestSellingMonths: [4, 5],
    demandLevel: 'বেশি',
    exportPotential: false,
    goodCompanions: ['শিম (মাচায়)'],
    badCompanions: [],
    govtSupport: ['সার ভর্তুকি', 'ভুট্টা ক্রয় কেন্দ্র'],
    tips: ['ভুট্টা পোল্ট্রি খাদ্যের চাহিদায় ভালো দাম পায়', 'Fall Armyworm দ্রুত ছড়ায় — প্রতিবেশীকেও জানান'],
  },

  // ════════════════════════════════════
  // ৬. টমেটো (from previous data)
  // ════════════════════════════════════
  'tomato': {
    id: 'tomato',
    name: 'টমেটো',
    nameEn: 'Tomato',
    icon: '🍅',
    category: 'সবজি',
    seasons: ['রবি'],
    plantingMonths: [9, 10, 11],
    harvestMonths: [1, 2, 3],
    totalDays: 150,
    soilTypes: ['দোআঁশ', 'এঁটেল', 'বেলে-দোআঁশ'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.0 },
    seedCostPerBigha: 2000,
    fertilizerCost: 5000,
    pesticideCost: 4000,
    laborCost: 8000,
    otherCost: 3000,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 80,
    yieldMax: 120,
    avgMarketPrice: 600,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'মাঝারি',
    riskFactors: ['Late blight মারাত্মক', 'দাম ওঠানামা করে', 'পোকামাকড় বেশি'],
    varieties: [
      { name: 'বারি টমেটো-১৪', type: 'উফশী', daysToHarvest: 140, yieldPerBigha: 95, special: 'রোগ সহিষ্ণু' },
      { name: 'বারি টমেটো-১৫', type: 'উফশী', daysToHarvest: 145, yieldPerBigha: 100 },
      { name: 'রতন/বারি টমেটো-১', type: 'উফশী', daysToHarvest: 140, yieldPerBigha: 95, special: 'শীতকালে দেশজুড়ে জনপ্রিয়' },
      { name: 'মানিক/বারি টমেটো-২', type: 'উফশী', daysToHarvest: 142, yieldPerBigha: 98, special: 'শীতকালে বহুল পরিচিত' },
      { name: 'রতন (হাইব্রিড)', type: 'হাইব্রিড', daysToHarvest: 140, yieldPerBigha: 115 },
      { name: 'মাহি (হাইব্রিড)', type: 'হাইব্রিড', daysToHarvest: 138, yieldPerBigha: 120, special: 'সর্বোচ্চ ফলন' },
      { name: 'লাল বাহাদুর (লাল তীর)', type: 'হাইব্রিড', daysToHarvest: 135, yieldPerBigha: 125, special: 'গ্রীষ্মকালীন, প্রচণ্ড গরমে টিকে থাকে, উচ্চ ফলন' },
      { name: 'বাহুবলী', type: 'হাইব্রিড', daysToHarvest: 138, yieldPerBigha: 120, special: 'সারা দেশে ব্যাপক চাষ' },
      { name: 'বিপুল প্লাস', type: 'হাইব্রিড', daysToHarvest: 140, yieldPerBigha: 120, special: 'সারা দেশে ব্যাপক চাষ' },
      { name: 'আনসাল F1 (Seminis/Bayer)', type: 'হাইব্রিড', daysToHarvest: 135, yieldPerBigha: 130, special: 'গ্রীষ্মকালীন; ৪৫°C পর্যন্ত তাপ ও প্রতিকূল আবহাওয়া সহিষ্ণু; ভালো দামের সময় অক্টো–জানু ও এপ্রিল–আগস্ট; আগাম চাষে আগস্টের শেষে চারা রোপন' },
    ],
    stages: [
      { id: 'seedbed', name: 'বীজতলা', icon: '🌱', startDay: 0, endDay: 25,
        tasks: [
          { title: 'বীজতলা তৈরি', type: 'preparation', urgency: 'জরুরি',
            desc: 'আগস্ট-সেপ্টেম্বরে (আগাম) বা অক্টোবরে বীজতলা।' },
          { title: 'বীজ শোধন', type: 'preparation', urgency: 'জরুরি',
            desc: '৫০°C পানিতে ৩০ মিনিট ভিজিয়ে শোধন।' },
          { title: 'ড্যাম্পিং অফ (টমেটো) দমন', type: 'disease', urgency: 'জরুরি',
            desc: 'চারা গোড়া পচে মরে যায়। মেটালাক্সিল বা কার্বক্সিন দিয়ে বীজ শোধন ও বীজতলার মাটি ভিজিয়ে দিন — বীজ বপনের আগে ও পরে।' },
        ]
      },
      { id: 'transplanting', name: 'রোপণ', icon: '🚜', startDay: 25, endDay: 35,
        tasks: [
          { title: 'জমি তৈরি', type: 'preparation', urgency: 'জরুরি',
            desc: '৪-৫ চাষ। ২৩০ সেমি চওড়া বেড।' },
          { title: 'চারা রোপণ', type: 'task', urgency: 'অত্যন্ত জরুরি',
            desc: '৬০×৪৫ সেমি দূরত্বে। বিকেলে রোপণ।' },
        ]
      },
      { id: 'vegetative', name: 'গাছের বৃদ্ধি', icon: '🌿', startDay: 35, endDay: 65,
        tasks: [
          { title: 'খুঁটি দেওয়া', type: 'task', urgency: 'অত্যন্ত জরুরি',
            desc: '"অ" আকৃতির বাঁশের খুঁটি।' },
          { title: 'ইউরিয়া ১ম কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'রোপণের ৩য় সপ্তাহে', desc: 'রিং পদ্ধতিতে দিন।' },
          { title: 'জাব পোকা (টমেটো) দমন', type: 'pest', urgency: 'জরুরি',
            desc: 'কচি পাতা ও ডগার রস চুষে খায়। অ্যাসিটামিপ্রিড বা ডাইমিথয়েট পাতার উপর ও নিচে স্প্রে — আক্রমণ দেখামাত্র।' },
          { title: 'সাদা মাছি (টমেটো) দমন', type: 'pest', urgency: 'জরুরি',
            desc: 'রস চুষে খায়, ভাইরাস ছড়ায়। ইমিডাক্লোপ্রিড বা থায়ামেথক্সাম পাতার নিচে স্প্রে — সকাল/বিকেলে ৭-১০ দিন পর পর।' },
          { title: 'ফিউজেরিয়াম উইল্ট (টমেটো) দমন', type: 'disease', urgency: 'জরুরি',
            desc: 'পাতা হলুদ হয়ে শুকায়, কান্ড কালো হয়। কার্বেন্ডাজিম বা থায়োফানেট মিথাইল মাটি ভিজিয়ে ও পাতায় — ১৫ দিন পর পর।' },
          { title: 'আর্লি ব্লাইট (টমেটো) দমন', type: 'disease', urgency: 'জরুরি',
            desc: 'পাতায় বাদামি গোল দাগ, কেন্দ্রে রিং। ম্যানকোজেব বা ক্লোরোথ্যালোনিল — ৭-১০ দিন পর পর, বৃষ্টির পর।' },
          { title: 'সেপটোরিয়া লিফ স্পট (টমেটো) দমন', type: 'disease', urgency: 'সাধারণ',
            desc: 'পাতায় সাদা কেন্দ্রসহ ছোট দাগ। কপার অক্সিক্লোরাইড বা টেবুকোনাজল নিচের পাতা থেকে উপরে — ১০ দিন পর পর।' },
        ]
      },
      { id: 'flowering', name: 'ফুল আসার সময়', icon: '🌸', startDay: 65, endDay: 95,
        tasks: [
          { title: 'ইউরিয়া ২য় কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'রোপণের ৫ম সপ্তাহে', desc: 'রিং পদ্ধতিতে।' },
          { title: 'পুনিং', type: 'task', urgency: 'জরুরি',
            desc: '২-৩টি মূল শাখা রাখুন।' },
          { title: 'লেট ব্লাইট (টমেটো) দমন', type: 'disease', urgency: 'অত্যন্ত জরুরি',
            desc: 'পাতায় কালো দাগ, ফল দ্রুত পচে। মেটালাক্সিল+ম্যানকোজেব বা সাইমক্সানিল পাতা ও কান্ডে — আর্দ্র আবহাওয়ায় ৫-৭ দিন পর পর।' },
          { title: 'ফল ছিদ্রকারী পোকা (টমেটো) দমন', type: 'pest', urgency: 'জরুরি',
            desc: 'ফলে ছিদ্র করে শাঁস খায়। ইমামেক্টিন বেনজোয়েট বা ক্লোরপাইরিফস ফুল ও ফলে — ফুল আসার পর থেকে ১০ দিন পর পর।' },
          { title: 'পাউডারি মিলডিউ (টমেটো) দমন', type: 'disease', urgency: 'সাধারণ',
            desc: 'পাতায় সাদা পাউডারের মত আবরণ। সালফার বা ট্রাইডিমেফন পাতার উভয় পিঠে — ৭-১০ দিন পর পর।' },
        ]
      },
      { id: 'fruit-dev', name: 'ফলের বিকাশ', icon: '🍅', startDay: 95, endDay: 130,
        tasks: [
          { title: 'নিয়মিত সেচ', type: 'irrigation', urgency: 'জরুরি',
            desc: 'মাটি শুকালে ফল ফেটে যায়।' },
          { title: 'রেড স্পাইডার মাইট (টমেটো) দমন', type: 'pest', urgency: 'জরুরি',
            desc: 'পাতায় হলুদ দাগ, পাতা শুকায়। প্রোপারগাইট বা ফেনপাইরক্সিমেট পাতার নিচে — আক্রমণের শুরুতেই ৫-৭ দিন পর পর।' },
          { title: 'পাতায় সার স্প্রে', type: 'fertilizer', urgency: 'সাধারণ',
            desc: 'Zinc ও Boron পাতায় স্প্রে।' },
        ]
      },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 130, endDay: 150,
        tasks: [
          { title: 'ফসল সংগ্রহ', type: 'harvest', urgency: 'জরুরি',
            desc: 'হালকা লাল হলে তুলুন। ৫-৭ দিন পরপর।' },
          { title: 'বাজারজাতকরণ', type: 'post-harvest', urgency: 'সাধারণ',
            desc: 'গ্রেড করে বিক্রি করুন। ফেব্রুয়ারিতে দাম বেশি।' },
        ]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 25, tsp: 12, mop: 16, gypsum: 7, zinc: 1.5, boron: 0.5 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.15, tsp: 1.1 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.05, tsp: 1.0 },
      },
      schedule: [
        { timing: 'রোপণের আগে', items: ['TSP', 'MOP ১/৩', 'Gypsum', 'Zinc', 'Boron', 'গোবর ৫০০ কেজি'], note: 'Basal' },
        { timing: 'রোপণের ৩য় সপ্তাহে', items: ['Urea ১/৩', 'MOP ১/৩'], note: '১ম top dress' },
        { timing: 'ফুল আসার সময়', items: ['Urea ১/৩', 'MOP ১/৩'], note: '২য় top dress' },
        { timing: 'ফল ধরার পর', items: ['Urea ১/৩'], note: '৩য় top dress' },
      ],
      warnings: ['Boron না দিলে ফল ফেটে যায়', 'অতিরিক্ত N দিলে পাতা বাড়ে ফল কমে'],
    },
    calendarEvents: [
      { month: 8, type: 'planting', title: 'আগাম বীজতলা', desc: 'আগস্টে আগাম চাষের জন্য' },
      { month: 10, type: 'planting', title: 'মূল বীজতলা', desc: 'অক্টোবরে মূল মৌসুম' },
      { month: 11, type: 'planting', title: 'রোপণ', desc: 'নভেম্বরে মাঠে রোপণ' },
      { month: 1, type: 'harvest', title: 'সংগ্রহ শুরু', desc: 'জানুয়ারি থেকে তোলা শুরু' },
      { month: 3, type: 'harvest', title: 'শেষ সংগ্রহ', desc: 'মার্চে শেষ করুন' },
    ],
    bestSellingMonths: [10, 11, 12, 1],
    demandLevel: 'বেশি',
    exportPotential: true,
    goodCompanions: ['তুলসি', 'গাঁদা ফুল', 'পেঁয়াজ'],
    badCompanions: ['শসা', 'মরিচ', 'বেগুন'],
    govtSupport: ['সার ভর্তুকি'],
    tips: [
      'ফেব্রুয়ারিতে সবচেয়ে ভালো দাম',
      'লেট ব্লাইট দ্রুত ছড়ায় — প্রতিদিন জমি দেখুন',
      'হাইব্রিড জাতে ফলন বেশি কিন্তু বীজ খরচ বেশি',
    ],
  },

  // ════════════════════════════════════
  // ৭. ফুলকপি
  // ════════════════════════════════════
  'fulkopi': {
    id: 'fulkopi',
    name: 'ফুলকপি',
    nameEn: 'Cauliflower',
    icon: '🌿',
    iconImage: cauliflowerIcon,
    category: 'সবজি',
    seasons: ['রবি'],
    plantingMonths: [9, 10, 11],
    harvestMonths: [12, 1, 2],
    totalDays: 90,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.0 },
    seedCostPerBigha: 1500,
    fertilizerCost: 4000,
    pesticideCost: 3000,
    laborCost: 7000,
    otherCost: 1500,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 60,
    yieldMax: 100,
    avgMarketPrice: 500,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'মাঝারি',
    riskFactors: ['ডায়মন্ড ব্যাক মথ', 'বোরনের অভাবে ফুল কালো হয়', 'তাপমাত্রার প্রতি সংবেদনশীল'],
    varieties: [
      { name: 'বারি ফুলকপি-১', type: 'উফশী', daysToHarvest: 85, yieldPerBigha: 70, special: 'আগাম' },
      { name: 'হোয়াইট সুপার', type: 'হাইব্রিড', daysToHarvest: 90, yieldPerBigha: 95 },
      { name: 'স্নোবল', type: 'উফশী', daysToHarvest: 95, yieldPerBigha: 80 },
      // আগাম জাত (ভাদ্র-আশ্বিনে বীজ → কার্তিক-অগ্রহায়ণে বাজার)
      { name: 'কার্তিকী / পটনাই / অগ্রহায়ণী', type: 'উফশী', daysToHarvest: 75, yieldPerBigha: 65, special: 'আগাম — আর্লিপানাই, আর্লিস্নোবলও এই দলে' },
      { name: 'ট্রপিক্যাল-৫৫', type: 'হাইব্রিড', daysToHarvest: 60, yieldPerBigha: 90, special: 'আগাম, গরম সহনশীল' },
      { name: 'সামার ডায়মন্ড F1', type: 'হাইব্রিড', daysToHarvest: 65, yieldPerBigha: 95, special: 'আগাম, গ্রীষ্মে ভালো' },
      { name: 'স্নো কুইন F1 / হিট মাস্টার / মিজুকি', type: 'হাইব্রিড', daysToHarvest: 70, yieldPerBigha: 100, special: 'আগাম হাইব্রিড সিরিজ' },
      { name: 'সুপার ট্যাবি F1 / হোয়াইট ক্রাউন F1 / এভারেস্ট', type: 'হাইব্রিড', daysToHarvest: 70, yieldPerBigha: 100, special: 'আগাম, উচ্চ ফলন' },
      // মাঝারি জাত (কার্তিক-অগ্রহায়ণে রোপণ → পৌষ-মাঘে সংগ্রহ)
      { name: 'পৌষালী / রাক্ষুসী', type: 'উফশী', daysToHarvest: 90, yieldPerBigha: 80, special: 'মাঝারি মৌসুম' },
      { name: 'স্নোবল-X / স্নোবল-Y', type: 'উফশী', daysToHarvest: 95, yieldPerBigha: 85, special: 'মাঝারি, জনপ্রিয়' },
      { name: 'হোয়াইট টপ / স্লোওয়েভ / বিগশট', type: 'হাইব্রিড', daysToHarvest: 90, yieldPerBigha: 110, special: 'মাঝারি হাইব্রিড' },
      { name: 'সিভান F1 / চান্ডি F1 / হোয়াইট ফ্ল্যাশ', type: 'হাইব্রিড', daysToHarvest: 90, yieldPerBigha: 110, special: 'মাঝারি, বাজারে চাহিদা বেশি' },
      // নাবী জাত (মাঘ-ফাল্গুনে ফলন)
      { name: 'মাঘী / বেনারসি', type: 'উফশী', daysToHarvest: 110, yieldPerBigha: 85, special: 'নাবী জাত' },
      { name: 'ইউনিক স্নোবল / হোয়াইট মাউন্টেন', type: 'উফশী', daysToHarvest: 115, yieldPerBigha: 85, special: 'নাবী, বড় ফুল' },
      { name: 'ক্রিস্টমাস / এরফাট / হোয়াইট জায়ান্ট F1', type: 'হাইব্রিড', daysToHarvest: 110, yieldPerBigha: 115, special: 'নাবী হাইব্রিড' },
      // রঙিন / পুষ্টিসমৃদ্ধ আধুনিক জাত
      { name: 'ভ্যালেন্টিনা পিঙ্ক', type: 'হাইব্রিড', daysToHarvest: 90, yieldPerBigha: 80, special: 'রঙিন — গোলাপি/বেগুনি, উচ্চ দাম' },
      { name: 'ক্যারোটিনা ইয়োলো', type: 'হাইব্রিড', daysToHarvest: 90, yieldPerBigha: 80, special: 'রঙিন — হলুদ/কমলা, ক্যারোটিন সমৃদ্ধ' },
    ],
    stages: [
      { id: 'seedbed', name: 'বীজতলা', icon: '🌱', startDay: 0, endDay: 25,
        tasks: [
          { title: 'বীজতলা', type: 'preparation', urgency: 'জরুরি',
            desc: 'আগস্ট-সেপ্টেম্বরে (আগাম) বা অক্টোবরে বীজতলা।' },
        ]
      },
      { id: 'transplanting', name: 'রোপণ', icon: '🚜', startDay: 25, endDay: 35,
        tasks: [
          { title: 'রোপণ', type: 'task', urgency: 'জরুরি',
            desc: '৬০×৪৫ সেমি দূরত্বে। বেড তৈরি করে রোপণ।' },
          { title: 'বোরন দিন', type: 'fertilizer', urgency: 'অত্যন্ত জরুরি',
            desc: 'বোরন না দিলে ফুল কালো হয়। অবশ্যই দিন।' },
        ]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 35, endDay: 65,
        tasks: [
          { title: 'ডায়মন্ড ব্যাক মথ দমন', type: 'pest', urgency: 'অত্যন্ত জরুরি',
            desc: 'Spinosad বা Emamectin benzoate দিন।' },
          { title: 'ইউরিয়া প্রয়োগ', type: 'fertilizer', urgency: 'জরুরি',
            desc: '২ কিস্তিতে রোপণের ৩য় ও ৫ম সপ্তাহে।' },
          { title: 'সেচ', type: 'irrigation', urgency: 'জরুরি',
            desc: '৭-১০ দিন পরপর সেচ। গোড়ায় পানি না জমতে দিন।' },
        ]
      },
      { id: 'curd', name: 'ফুল আসা', icon: '🥦', startDay: 65, endDay: 85,
        tasks: [
          { title: 'পাতা দিয়ে ফুল ঢাকা', type: 'task', urgency: 'জরুরি',
            desc: 'সূর্যের আলো থেকে ফুল ঢাকুন। সাদা থাকবে।' },
        ]
      },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 85, endDay: 90,
        tasks: [
          { title: 'ফুলকপি তোলা', type: 'harvest', urgency: 'জরুরি',
            desc: 'শক্ত ও সাদা থাকতে তুলুন। দেরি করলে হলুদ হয়।' },
        ]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 22, tsp: 11, mop: 14, gypsum: 6, zinc: 1.0, boron: 0.8 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.1, tsp: 1.1 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'রোপণের আগে', items: ['TSP', 'MOP ১/২', 'Gypsum', 'Zinc', 'Boron', 'গোবর ৪০০ কেজি'], note: '' },
        { timing: 'রোপণের ৩য় সপ্তাহে', items: ['Urea ১/২', 'MOP ১/২'], note: '' },
        { timing: 'রোপণের ৫ম সপ্তাহে', items: ['Urea ১/২'], note: '' },
      ],
      warnings: ['Boron অবশ্যই দিন — না দিলে ফুল কালো হয়'],
    },
    calendarEvents: [
      { month: 9, type: 'planting', title: 'আগাম বীজতলা', desc: 'সেপ্টেম্বরে' },
      { month: 10, type: 'planting', title: 'রোপণ', desc: 'অক্টোবরে মাঠে' },
      { month: 12, type: 'harvest', title: 'সংগ্রহ', desc: 'ডিসেম্বর-জানুয়ারিতে' },
    ],
    bestSellingMonths: [12, 1],
    demandLevel: 'বেশি',
    exportPotential: false,
    goodCompanions: ['টমেটো', 'পেঁয়াজ'],
    badCompanions: ['বাঁধাকপি (একসাথে না)'],
    govtSupport: ['সার ভর্তুকি'],
    tips: ['Boron সবচেয়ে গুরুত্বপূর্ণ', 'ডায়মন্ড ব্যাক মথ প্রতিরোধ করা কঠিন — সতর্ক থাকুন'],
  },

  // ════════════════════════════════════
  // ৮. বাঁধাকপি
  // ════════════════════════════════════
  'badhakopi': {
    id: 'badhakopi',
    name: 'বাঁধাকপি',
    nameEn: 'Cabbage',
    icon: '🥬',
    category: 'সবজি',
    seasons: ['রবি'],
    plantingMonths: [9, 10, 11],
    harvestMonths: [12, 1, 2],
    totalDays: 90,
    soilTypes: ['দোআঁশ', 'এঁটেল', 'বেলে-দোআঁশ'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.5 },
    seedCostPerBigha: 1500,
    fertilizerCost: 3500,
    pesticideCost: 2500,
    laborCost: 6000,
    otherCost: 1500,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 80,
    yieldMax: 130,
    avgMarketPrice: 350,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['ডায়মন্ড ব্যাক মথ', 'দাম কম থাকতে পারে'],
    varieties: [
      { name: 'বারি বাঁধাকপি-১', type: 'উফশী', daysToHarvest: 85, yieldPerBigha: 100 },
      { name: 'গ্রিন এক্সপ্রেস', type: 'হাইব্রিড', daysToHarvest: 80, yieldPerBigha: 125 },
    ],
    stages: [
      { id: 'seedbed', name: 'বীজতলা', icon: '🌱', startDay: 0, endDay: 25,
        tasks: [{ title: 'বীজতলা', type: 'preparation', urgency: 'জরুরি', desc: 'সেপ্টেম্বর-অক্টোবরে বীজতলা।' }]
      },
      { id: 'transplanting', name: 'রোপণ', icon: '🚜', startDay: 25, endDay: 35,
        tasks: [
          { title: 'রোপণ', type: 'task', urgency: 'জরুরি', desc: '৬০×৪৫ সেমি দূরত্বে রোপণ।' },
          { title: 'বেসাল সার', type: 'fertilizer', urgency: 'জরুরি', desc: 'TSP, MOP, গোবর রোপণের আগে।' },
        ]
      },
      { id: 'heading', name: 'মাথা বাঁধা', icon: '🥬', startDay: 60, endDay: 85,
        tasks: [
          { title: 'ইউরিয়া ২য় কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            desc: 'মাথা বাঁধার সময় ইউরিয়া দিন।' },
          { title: 'পোকা দমন', type: 'pest', urgency: 'জরুরি',
            desc: 'ডায়মন্ড ব্যাক মথ — Emamectin বা Spinosad দিন।' },
        ]
      },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 85, endDay: 90,
        tasks: [{ title: 'বাঁধাকপি তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: 'মাথা শক্ত হলে তুলুন। দেরি করলে ফেটে যায়।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 20, tsp: 10, mop: 12, gypsum: 5, zinc: 1.0, boron: 0.5 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.1, tsp: 1.1 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'রোপণের আগে', items: ['TSP', 'MOP ১/২', 'Gypsum', 'Zinc', 'Boron', 'গোবর ৪০০ কেজি'], note: '' },
        { timing: '৩য় সপ্তাহে', items: ['Urea ১/২', 'MOP ১/২'], note: '' },
        { timing: 'মাথা বাঁধার সময়', items: ['Urea ১/২'], note: '' },
      ],
      warnings: ['দেরিতে ইউরিয়া দিলে মাথা ঠিকমতো বাঁধে না'],
    },
    calendarEvents: [
      { month: 9, type: 'planting', title: 'বীজতলা', desc: 'সেপ্টেম্বরে' },
      { month: 12, type: 'harvest', title: 'সংগ্রহ', desc: 'ডিসেম্বর-জানুয়ারিতে' },
    ],
    bestSellingMonths: [12, 1],
    demandLevel: 'বেশি',
    exportPotential: false,
    goodCompanions: ['পেঁয়াজ', 'গাজর'],
    badCompanions: ['ফুলকপি (একসাথে না লাগানো ভালো)'],
    govtSupport: ['সার ভর্তুকি'],
    tips: ['বাঁধাকপিতে ফলন বেশি কিন্তু দাম কম থাকে', 'শীতে ভালো দাম পাওয়া যায়'],
  },

  // ════════════════════════════════════
  // ৯. বেগুন (full data from prev)
  // ════════════════════════════════════
  'begun': {
    id: 'begun',
    name: 'বেগুন',
    nameEn: 'Eggplant',
    icon: '🍆',
    category: 'সবজি',
    seasons: ['রবি', 'খরিফ-১', 'সারা বছর'],
    plantingMonths: [9, 10, 2, 3],
    harvestMonths: [12, 1, 2, 5, 6],
    totalDays: 120,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ', 'এঁটেল'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 5.5, max: 6.8 },
    seedCostPerBigha: 1000,
    fertilizerCost: 4000,
    pesticideCost: 5000,
    laborCost: 7000,
    otherCost: 2000,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 80,
    yieldMax: 130,
    avgMarketPrice: 450,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'বেশি',
    riskFactors: ['ডগা ও ফল ছিদ্রকারী পোকা সবচেয়ে বড় সমস্যা', 'কীটনাশক খরচ বেশি'],
    varieties: [
      { name: 'বারি বেগুন-৪', type: 'উফশী', daysToHarvest: 110, yieldPerBigha: 90 },
      { name: 'বারি বেগুন-৮', type: 'উফশী', daysToHarvest: 115, yieldPerBigha: 100, special: 'Bt বেগুন (পোকা সহিষ্ণু)' },
      { name: 'ইসলামপুরী', type: 'স্থানীয়', daysToHarvest: 120, yieldPerBigha: 80 },
    ],
    stages: [
      { id: 'seedbed', name: 'বীজতলা', icon: '🌱', startDay: 0, endDay: 25,
        tasks: [{ title: 'বীজতলা', type: 'preparation', urgency: 'জরুরি',
          desc: 'সেপ্টেম্বর-অক্টোবরে বা ফেব্রুয়ারিতে।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 35, endDay: 70,
        tasks: [
          { title: 'ডগা ছিদ্রকারী পোকা দমন', type: 'pest', urgency: 'অত্যন্ত জরুরি',
            desc: 'সাপ্তাহিক পর্যবেক্ষণ। কারাটে বা Spinosad দিন।' },
          { title: 'ইউরিয়া ১ম কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'রোপণের ২০ দিন পর', desc: '' },
        ]
      },
      { id: 'flowering', name: 'ফুল ও ফল', icon: '🍆', startDay: 70, endDay: 110,
        tasks: [
          { title: 'ফল ছিদ্রকারী পোকা দমন', type: 'pest', urgency: 'অত্যন্ত জরুরি',
            desc: 'ফেরোমন ফাঁদ + কীটনাশক। Bt বেগুন লাগালে কম লাগে।' },
          { title: 'ইউরিয়া ২য় কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'ফুল আসার সময়', desc: '' },
        ]
      },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 110, endDay: 120,
        tasks: [{ title: 'বেগুন তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: '৫-৭ দিন পরপর তুলুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 22, tsp: 10, mop: 13, gypsum: 6, zinc: 1.0 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.15, tsp: 1.1 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.05, tsp: 1.0 },
      },
      schedule: [
        { timing: 'রোপণের আগে', items: ['TSP', 'MOP ১/২', 'Gypsum', 'Zinc', 'গোবর ৪০০ কেজি'], note: '' },
        { timing: '২০ দিন পর', items: ['Urea ১/২', 'MOP ১/২'], note: '' },
        { timing: 'ফুল আসার সময়', items: ['Urea ১/২'], note: '' },
      ],
      warnings: ['ডগা ছিদ্রকারী পোকা দেখলে তাৎক্ষণিক ব্যবস্থা নিন'],
    },
    calendarEvents: [
      { month: 9, type: 'planting', title: 'রবি বীজতলা', desc: 'সেপ্টেম্বরে' },
      { month: 2, type: 'planting', title: 'গ্রীষ্ম বীজতলা', desc: 'ফেব্রুয়ারিতে' },
      { month: 1, type: 'harvest', title: 'রবি সংগ্রহ', desc: 'জানুয়ারি থেকে' },
    ],
    bestSellingMonths: [1, 2, 6, 7],
    demandLevel: 'বেশি',
    exportPotential: false,
    goodCompanions: ['ধনে', 'পুদিনা'],
    badCompanions: ['টমেটো', 'মরিচ'],
    govtSupport: ['সার ভর্তুকি', 'Bt বেগুন বিনামূল্যে বিতরণ'],
    tips: ['Bt বেগুন চাষ করলে কীটনাশক ৭০% কম লাগে', 'ডগা ছিদ্রকারী পোকা প্রতিরোধে ফেরোমন ফাঁদ ব্যবহার করুন'],
  },

  // ════════════════════════════════════
  // ১০. মরিচ
  // ════════════════════════════════════
  'morich': {
    id: 'morich',
    name: 'মরিচ',
    nameEn: 'Chilli',
    icon: '🌶️',
    category: 'মসলা',
    seasons: ['রবি', 'খরিফ-১'],
    plantingMonths: [9, 10, 2],
    harvestMonths: [1, 2, 3, 5],
    totalDays: 130,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.0 },
    seedCostPerBigha: 1500,
    fertilizerCost: 4000,
    pesticideCost: 4000,
    laborCost: 8000,
    otherCost: 2000,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 30,
    yieldMax: 50,
    avgMarketPrice: 1500,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'মাঝারি',
    riskFactors: ['থ্রিপস ও মাইটস', 'এন্থ্রাকনোজ রোগ', 'দাম অস্থির'],
    varieties: [
      { name: 'বারি মরিচ-১', type: 'উফশী', daysToHarvest: 125, yieldPerBigha: 35 },
      { name: 'বারি মরিচ-২', type: 'উফশী', daysToHarvest: 130, yieldPerBigha: 40 },
      { name: 'বগুড়ার মরিচ', type: 'স্থানীয়', daysToHarvest: 135, yieldPerBigha: 30, special: 'ঝাল বেশি' },
    ],
    stages: [
      { id: 'seedbed', name: 'বীজতলা', icon: '🌱', startDay: 0, endDay: 25,
        tasks: [{ title: 'বীজতলা', type: 'preparation', urgency: 'জরুরি',
          desc: 'আগস্ট-সেপ্টেম্বরে বীজতলা।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 35, endDay: 80,
        tasks: [
          { title: 'থ্রিপস দমন', type: 'pest', urgency: 'অত্যন্ত জরুরি',
            desc: 'ইমিডাক্লোপ্রিড বা Spinosad দিন।' },
          { title: 'ইউরিয়া ১ম কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'রোপণের ২০ দিন পর', desc: '' },
        ]
      },
      { id: 'flowering', name: 'ফুল ও ফল', icon: '🌶️', startDay: 80, endDay: 120,
        tasks: [
          { title: 'ইউরিয়া ২য় কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'ফুল আসার সময়', desc: '' },
          { title: 'এন্থ্রাকনোজ দমন', type: 'disease', urgency: 'জরুরি',
            desc: 'কার্বেনডাজিম বা প্রোপিকোনাজোল।' },
        ]
      },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 120, endDay: 130,
        tasks: [{ title: 'মরিচ তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: 'পাকা লাল মরিচ তুলুন। কাঁচা অবস্থায়ও বিক্রি হয়।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 20, tsp: 10, mop: 12, gypsum: 5, zinc: 1.0, boron: 0.5 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.15, tsp: 1.1 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.05, tsp: 1.0 },
      },
      schedule: [
        { timing: 'রোপণের আগে', items: ['TSP', 'MOP ১/৩', 'Gypsum', 'Zinc', 'Boron'], note: '' },
        { timing: '২০ দিন পর', items: ['Urea ১/২', 'MOP ১/৩'], note: '' },
        { timing: 'ফুল আসার সময়', items: ['Urea ১/২', 'MOP ১/৩'], note: '' },
      ],
      warnings: ['ফুল আসার সময় কীটনাশক স্প্রে করবেন না'],
    },
    calendarEvents: [
      { month: 9, type: 'planting', title: 'বীজতলা', desc: 'সেপ্টেম্বরে' },
      { month: 10, type: 'planting', title: 'রোপণ', desc: 'অক্টোবরে' },
      { month: 1, type: 'harvest', title: 'সংগ্রহ', desc: 'জানুয়ারি থেকে' },
    ],
    bestSellingMonths: [1, 2, 3, 10, 11],
    demandLevel: 'বেশি',
    exportPotential: true,
    goodCompanions: ['টমেটো', 'পেঁয়াজ'],
    badCompanions: ['বেগুন'],
    govtSupport: ['সার ভর্তুকি'],
    tips: ['শুকনো মরিচে দাম বেশি', 'থ্রিপস নিয়ন্ত্রণে নীল আঠালো ফাঁদ ব্যবহার করুন'],
  },

  // ════════════════════════════════════
  // ১১. ঢেঁড়স
  // ════════════════════════════════════
  'dheros': {
    id: 'dheros',
    name: 'ঢেঁড়স',
    nameEn: 'Okra',
    icon: '🌿',
    iconImage: okraIcon,
    category: 'সবজি',
    seasons: ['খরিফ-১', 'খরিফ-২', 'রবি'],
    plantingMonths: [2, 3, 7, 8],
    harvestMonths: [4, 5, 9, 10],
    totalDays: 70,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ', 'পলি'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.5 },
    seedCostPerBigha: 800,
    fertilizerCost: 2500,
    pesticideCost: 2000,
    laborCost: 5000,
    otherCost: 1000,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 40,
    yieldMax: 70,
    avgMarketPrice: 600,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['ভাইরাস রোগ', 'ফ্রুট বোরার'],
    varieties: [
      { name: 'বারি ঢেঁড়স-১', type: 'উফশী', daysToHarvest: 65, yieldPerBigha: 55 },
      { name: 'বারি ঢেঁড়স-২', type: 'উফশী', daysToHarvest: 68, yieldPerBigha: 60 },
    ],
    stages: [
      { id: 'sowing', name: 'বপন', icon: '🌱', startDay: 0, endDay: 10,
        tasks: [{ title: 'বীজ বপন', type: 'task', urgency: 'জরুরি',
          desc: 'সারিতে ৪৫×৩০ সেমি দূরত্বে বপন। ২-৩ সেমি গভীরে।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 10, endDay: 45,
        tasks: [
          { title: 'ইউরিয়া প্রয়োগ', type: 'fertilizer', urgency: 'জরুরি',
            desc: '২ কিস্তিতে — বপনের ২০ ও ৪০ দিনে।' },
          { title: 'ভাইরাস নিয়ন্ত্রণ', type: 'disease', urgency: 'জরুরি',
            desc: 'সাদা মাছি দমন করলে ভাইরাস কম ছড়ায়।' },
        ]
      },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 55, endDay: 70,
        tasks: [{ title: 'ঢেঁড়স তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: '৩-৪ দিন পরপর তুলুন। বড় হলে শক্ত হয়।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 14, tsp: 7, mop: 8, gypsum: 5, zinc: 0.8 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.1, tsp: 1.05 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'বপনের আগে', items: ['TSP', 'MOP', 'Gypsum', 'Zinc', 'গোবর ৩০০ কেজি'], note: '' },
        { timing: 'বপনের ২০ দিন পর', items: ['Urea ১/২'], note: '' },
        { timing: 'বপনের ৪০ দিন পর', items: ['Urea ১/২'], note: '' },
      ],
      warnings: ['ঢেঁড়স দ্রুত বড় হয় — নিয়মিত তুলুন'],
    },
    calendarEvents: [
      { month: 2, type: 'planting', title: 'রবি বপন', desc: 'ফেব্রুয়ারিতে' },
      { month: 7, type: 'planting', title: 'বর্ষা বপন', desc: 'জুলাইতে' },
      { month: 4, type: 'harvest', title: 'সংগ্রহ', desc: 'এপ্রিলে' },
    ],
    bestSellingMonths: [4, 5, 9],
    demandLevel: 'মাঝারি',
    exportPotential: false,
    goodCompanions: ['লাউ', 'কুমড়া'],
    badCompanions: [],
    govtSupport: ['সার ভর্তুকি'],
    tips: ['ঢেঁড়স দ্রুত ফসল দেয় — ৭০ দিনে তোলা যায়', 'গরমে ভালো হয়'],
  },

  // ════════════════════════════════════
  // ১২. শসা
  // ════════════════════════════════════
  'shasha': {
    id: 'shasha',
    name: 'শসা',
    nameEn: 'Cucumber',
    icon: '🥒',
    category: 'সবজি',
    seasons: ['রবি', 'খরিফ-১'],
    plantingMonths: [1, 2, 7, 8],
    harvestMonths: [3, 4, 9, 10],
    totalDays: 60,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.0 },
    seedCostPerBigha: 1200,
    fertilizerCost: 3000,
    pesticideCost: 2500,
    laborCost: 6000,
    otherCost: 1500,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 60,
    yieldMax: 100,
    avgMarketPrice: 500,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'মাঝারি',
    riskFactors: ['ডাউনি মিলডিউ', 'লাল মাকড়'],
    varieties: [
      { name: 'বারি শসা-১', type: 'উফশী', daysToHarvest: 55, yieldPerBigha: 70 },
      { name: 'বারি শসা-২', type: 'উফশী', daysToHarvest: 58, yieldPerBigha: 80 },
      { name: 'হাইব্রিড শসা', type: 'হাইব্রিড', daysToHarvest: 55, yieldPerBigha: 100 },
    ],
    stages: [
      { id: 'sowing', name: 'বপন', icon: '🌱', startDay: 0, endDay: 10,
        tasks: [{ title: 'মাদায় বপন', type: 'task', urgency: 'জরুরি',
          desc: 'মাদায় ৩-৪টি বীজ। ১.৫×১ মিটার দূরত্বে মাদা।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি ও মাচা', icon: '🌿', startDay: 10, endDay: 40,
        tasks: [
          { title: 'মাচা তৈরি', type: 'task', urgency: 'অত্যন্ত জরুরি',
            desc: 'বাঁশের মাচা তৈরি করুন। ফলন বাড়বে।' },
          { title: 'লাল মাকড় দমন', type: 'pest', urgency: 'জরুরি',
            desc: 'ডায়কোফল বা আবামেক্টিন স্প্রে।' },
          { title: 'ডাউনি মিলডিউ দমন', type: 'disease', urgency: 'জরুরি',
            desc: 'ম্যানকোজেব বা কপার অক্সিক্লোরাইড।' },
        ]
      },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 50, endDay: 60,
        tasks: [{ title: 'শসা তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: '২-৩ দিন পরপর তুলুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 15, tsp: 8, mop: 10, gypsum: 5, zinc: 1.0, boron: 0.4 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.1, tsp: 1.05 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'মাদা তৈরিতে', items: ['TSP', 'MOP ১/২', 'Gypsum', 'Zinc', 'Boron', 'গোবর ৩০০ কেজি'], note: '' },
        { timing: 'বপনের ১৫ দিন পর', items: ['Urea ১/২', 'MOP ১/২'], note: '' },
        { timing: 'ফুল আসার সময়', items: ['Urea ১/২'], note: '' },
      ],
      warnings: ['মাচা না দিলে ফলন অনেক কম হয়'],
    },
    calendarEvents: [
      { month: 1, type: 'planting', title: 'রবি বপন', desc: 'জানুয়ারিতে' },
      { month: 7, type: 'planting', title: 'বর্ষা বপন', desc: 'জুলাইতে' },
      { month: 3, type: 'harvest', title: 'সংগ্রহ', desc: 'মার্চে' },
    ],
    bestSellingMonths: [3, 4, 5, 9],
    demandLevel: 'বেশি',
    exportPotential: false,
    goodCompanions: ['শিম', 'বরবটি'],
    badCompanions: ['টমেটো', 'মরিচ'],
    govtSupport: ['সার ভর্তুকি'],
    tips: ['মাচায় চাষ করলে ফলন দ্বিগুণ হয়', 'গরমে শসার চাহিদা বেশি'],
  },

  // ════════════════════════════════════
  // ১৩. করলা
  // ════════════════════════════════════
  'korola': {
    id: 'korola',
    name: 'করলা',
    nameEn: 'Bitter Gourd',
    icon: '🌿',
    iconImage: bitterGourdIcon,
    category: 'সবজি',
    seasons: ['খরিফ-১', 'রবি'],
    plantingMonths: [1, 2, 7, 8],
    harvestMonths: [4, 5, 10],
    totalDays: 80,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.0 },
    seedCostPerBigha: 1000,
    fertilizerCost: 2800,
    pesticideCost: 2000,
    laborCost: 5500,
    otherCost: 1200,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 40,
    yieldMax: 70,
    avgMarketPrice: 700,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['ফ্রুট ফ্লাই', 'পাউডারি মিলডিউ'],
    varieties: [
      { name: 'বারি করলা-১', type: 'উফশী', daysToHarvest: 75, yieldPerBigha: 50 },
      { name: 'গজ করলা', type: 'স্থানীয়', daysToHarvest: 80, yieldPerBigha: 45 },
    ],
    stages: [
      { id: 'sowing', name: 'বপন', icon: '🌱', startDay: 0, endDay: 10,
        tasks: [{ title: 'মাদায় বপন', type: 'task', urgency: 'জরুরি',
          desc: '২×১.৫ মিটার দূরত্বে মাদায় বপন।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 10, endDay: 55,
        tasks: [
          { title: 'মাচা তৈরি', type: 'task', urgency: 'অত্যন্ত জরুরি',
            desc: 'বাঁশ বা দড়ির মাচা।' },
          { title: 'ফ্রুট ফ্লাই ফাঁদ', type: 'pest', urgency: 'জরুরি',
            desc: 'প্রোটিন হাইড্রোলাইজেট ফাঁদ ব্যবহার।' },
        ]
      },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 65, endDay: 80,
        tasks: [{ title: 'করলা তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: 'কাঁচা সবুজ অবস্থায় তুলুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 14, tsp: 8, mop: 9, gypsum: 5, zinc: 0.8, boron: 0.4 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.1, tsp: 1.05 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'মাদায়', items: ['TSP', 'MOP', 'Gypsum', 'গোবর ৩০০ কেজি'], note: '' },
        { timing: '১৫ দিন পর', items: ['Urea ১/২'], note: '' },
        { timing: 'ফুল আসার সময়', items: ['Urea ১/২'], note: '' },
      ],
      warnings: ['ফ্রুট ফ্লাই ফাঁদ অবশ্যই দিন'],
    },
    calendarEvents: [
      { month: 2, type: 'planting', title: 'রবি বপন', desc: 'ফেব্রুয়ারিতে' },
      { month: 7, type: 'planting', title: 'বর্ষা বপন', desc: 'জুলাইতে' },
      { month: 4, type: 'harvest', title: 'সংগ্রহ', desc: 'এপ্রিলে' },
    ],
    bestSellingMonths: [4, 5, 10],
    demandLevel: 'মাঝারি',
    exportPotential: false,
    goodCompanions: ['লাউ', 'কুমড়া'],
    badCompanions: [],
    govtSupport: ['সার ভর্তুকি'],
    tips: ['গরমে দাম ভালো', 'ফ্রুট ফ্লাই করলার সবচেয়ে বড় শত্রু'],
  },

  // ════════════════════════════════════
  // ১৪. লাউ
  // ════════════════════════════════════
  'lau': {
    id: 'lau',
    name: 'লাউ',
    nameEn: 'Bottle Gourd',
    icon: '🌿',
    iconImage: bottleGourdIcon,
    category: 'সবজি',
    seasons: ['রবি', 'খরিফ-১'],
    plantingMonths: [9, 10, 3, 4],
    harvestMonths: [1, 2, 3, 6, 7],
    totalDays: 90,
    soilTypes: ['দোআঁশ', 'এঁটেল', 'পলি'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.5 },
    seedCostPerBigha: 800,
    fertilizerCost: 3000,
    pesticideCost: 2000,
    laborCost: 5000,
    otherCost: 1200,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 80,
    yieldMax: 150,
    avgMarketPrice: 300,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['ফ্রুট ফ্লাই', 'দাম কম হতে পারে'],
    varieties: [
      { name: 'বারি লাউ-১', type: 'উফশী', daysToHarvest: 85, yieldPerBigha: 110 },
      { name: 'বারি লাউ-৪', type: 'উফশী', daysToHarvest: 90, yieldPerBigha: 130 },
    ],
    stages: [
      { id: 'sowing', name: 'বপন', icon: '🌱', startDay: 0, endDay: 10,
        tasks: [{ title: 'মাদায় বপন', type: 'task', urgency: 'জরুরি',
          desc: '২×২ মিটার দূরত্বে মাদায় বপন।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 10, endDay: 60,
        tasks: [
          { title: 'মাচা তৈরি', type: 'task', urgency: 'অত্যন্ত জরুরি',
            desc: 'শক্ত মাচা তৈরি করুন।' },
          { title: 'ইউরিয়া ১ম কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: '১৫ দিন পর', desc: '' },
        ]
      },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 75, endDay: 90,
        tasks: [{ title: 'লাউ তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: '৭-১০ দিন পরপর তুলুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 18, tsp: 9, mop: 11, gypsum: 5, zinc: 1.0 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.1, tsp: 1.05 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'মাদায়', items: ['TSP', 'MOP', 'Gypsum', 'Zinc', 'গোবর ৪০০ কেজি'], note: '' },
        { timing: '১৫ দিন পর', items: ['Urea ১/২'], note: '' },
        { timing: 'ফুল আসার সময়', items: ['Urea ১/২'], note: '' },
      ],
      warnings: ['মাচা শক্ত না হলে ফলের ভারে ভেঙে পড়বে'],
    },
    calendarEvents: [
      { month: 9, type: 'planting', title: 'রবি বপন', desc: 'সেপ্টেম্বরে' },
      { month: 3, type: 'planting', title: 'গ্রীষ্ম বপন', desc: 'মার্চে' },
      { month: 1, type: 'harvest', title: 'রবি সংগ্রহ', desc: 'জানুয়ারিতে' },
    ],
    bestSellingMonths: [1, 2, 6, 7],
    demandLevel: 'বেশি',
    exportPotential: false,
    goodCompanions: ['করলা', 'শিম'],
    badCompanions: [],
    govtSupport: ['সার ভর্তুকি'],
    tips: ['লাউ বাজারে সারা বছর বিক্রি হয়', 'গ্রীষ্মে দাম বেশি'],
  },

  // ════════════════════════════════════
  // ১৫. মিষ্টি কুমড়া
  // ════════════════════════════════════
  'mishti-kumra': {
    id: 'mishti-kumra',
    name: 'মিষ্টি কুমড়া',
    nameEn: 'Pumpkin',
    icon: '🎃',
    category: 'সবজি',
    seasons: ['খরিফ-১', 'রবি'],
    plantingMonths: [1, 2, 7, 8],
    harvestMonths: [4, 5, 10, 11],
    totalDays: 110,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ', 'পলি'],
    waterRequirement: 'কম',
    irrigationNeeded: false,
    phRange: { min: 6.0, max: 7.5 },
    seedCostPerBigha: 600,
    fertilizerCost: 2500,
    pesticideCost: 1500,
    laborCost: 4000,
    otherCost: 900,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 60,
    yieldMax: 120,
    avgMarketPrice: 400,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['পাউডারি মিলডিউ'],
    varieties: [
      { name: 'বারি মিষ্টি কুমড়া-১', type: 'উফশী', daysToHarvest: 105, yieldPerBigha: 80 },
      { name: 'বারি মিষ্টি কুমড়া-২', type: 'উফশী', daysToHarvest: 110, yieldPerBigha: 100 },
    ],
    stages: [
      { id: 'sowing', name: 'বপন', icon: '🌱', startDay: 0, endDay: 10,
        tasks: [{ title: 'মাদায় বপন', type: 'task', urgency: 'জরুরি',
          desc: '২×২ মিটার দূরত্বে। নদীর চর ও পতিত জমিতেও ভালো হয়।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 10, endDay: 70,
        tasks: [
          { title: 'ইউরিয়া প্রয়োগ', type: 'fertilizer', urgency: 'জরুরি',
            desc: '২ কিস্তিতে।' },
          { title: 'পাউডারি মিলডিউ দমন', type: 'disease', urgency: 'জরুরি',
            desc: 'সালফার বা কার্বেনডাজিম।' },
        ]
      },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 100, endDay: 110,
        tasks: [{ title: 'কুমড়া তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: 'পাকা হলে তুলুন। দীর্ঘদিন রাখা যায়।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 15, tsp: 8, mop: 9, gypsum: 5, zinc: 0.8 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.1, tsp: 1.05 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'মাদায়', items: ['TSP', 'MOP', 'Gypsum', 'গোবর ৩০০ কেজি'], note: '' },
        { timing: '২০ দিন পর', items: ['Urea ১/২'], note: '' },
        { timing: 'ফুল আসার সময়', items: ['Urea ১/২'], note: '' },
      ],
      warnings: ['পতিত জমিতেও চাষ করা যায়'],
    },
    calendarEvents: [
      { month: 1, type: 'planting', title: 'রবি বপন', desc: 'জানুয়ারিতে' },
      { month: 7, type: 'planting', title: 'বর্ষা বপন', desc: 'জুলাইতে' },
      { month: 4, type: 'harvest', title: 'সংগ্রহ', desc: 'এপ্রিলে' },
    ],
    bestSellingMonths: [4, 5, 10, 11],
    demandLevel: 'মাঝারি',
    exportPotential: false,
    goodCompanions: ['ভুট্টা', 'আলু'],
    badCompanions: [],
    govtSupport: ['সার ভর্তুকি'],
    tips: ['চরের জমিতে ভালো হয়', 'সংরক্ষণ ক্ষমতা বেশি — ৩-৪ মাস রাখা যায়'],
  },

  // ════════════════════════════════════
  // ১৬. পটল
  // ════════════════════════════════════
  'potol': {
    id: 'potol',
    name: 'পটল',
    nameEn: 'Pointed Gourd',
    icon: '🌿',
    iconImage: pointedGourdIcon,
    category: 'সবজি',
    seasons: ['রবি', 'খরিফ-১'],
    plantingMonths: [10, 11, 1, 2],
    harvestMonths: [3, 4, 5, 6, 7],
    totalDays: 120,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.0 },
    seedCostPerBigha: 3000,
    fertilizerCost: 3500,
    pesticideCost: 2500,
    laborCost: 6000,
    otherCost: 1500,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 60,
    yieldMax: 100,
    avgMarketPrice: 600,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'মাঝারি',
    riskFactors: ['লতানো গাছ — মাচা দরকার', 'ডাউনি মিলডিউ'],
    varieties: [
      { name: 'বারি পটল-১', type: 'উফশী', daysToHarvest: 115, yieldPerBigha: 75 },
      { name: 'বারি পটল-২', type: 'উফশী', daysToHarvest: 120, yieldPerBigha: 85 },
    ],
    stages: [
      { id: 'planting', name: 'কাটিং রোপণ', icon: '🌱', startDay: 0, endDay: 20,
        tasks: [{ title: 'কাটিং লাগানো', type: 'task', urgency: 'জরুরি',
          desc: 'পটল বীজে নয়, কাটিং বা মূল থেকে রোপণ।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 20, endDay: 80,
        tasks: [
          { title: 'মাচা তৈরি', type: 'task', urgency: 'অত্যন্ত জরুরি',
            desc: 'শক্ত মাচা অবশ্যই তৈরি করুন।' },
          { title: 'পরাগায়ন', type: 'task', urgency: 'জরুরি',
            desc: 'পটলে কৃত্রিম পরাগায়ন করলে ফলন বাড়ে।' },
        ]
      },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 100, endDay: 120,
        tasks: [{ title: 'পটল তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: '৩-৪ দিন পরপর তুলুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 16, tsp: 9, mop: 10, gypsum: 5, zinc: 0.8 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.1, tsp: 1.05 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'রোপণের আগে', items: ['TSP', 'MOP', 'Gypsum', 'গোবর ৪০০ কেজি'], note: '' },
        { timing: '৩০ দিন পর', items: ['Urea ১/২'], note: '' },
        { timing: 'ফুল আসার সময়', items: ['Urea ১/২'], note: '' },
      ],
      warnings: ['কৃত্রিম পরাগায়ন না করলে ফল কম হয়'],
    },
    calendarEvents: [
      { month: 10, type: 'planting', title: 'কাটিং লাগানো', desc: 'অক্টোবর-নভেম্বরে' },
      { month: 3, type: 'harvest', title: 'সংগ্রহ শুরু', desc: 'মার্চ থেকে' },
      { month: 7, type: 'harvest', title: 'শেষ সংগ্রহ', desc: 'জুলাইতে' },
    ],
    bestSellingMonths: [4, 5, 6],
    demandLevel: 'মাঝারি',
    exportPotential: false,
    goodCompanions: ['লাউ'],
    badCompanions: [],
    govtSupport: ['সার ভর্তুকি'],
    tips: ['পটল বহুবর্ষজীবী — একবার লাগালে ৩-৪ বছর ফলন দেয়', 'গ্রীষ্মে চাহিদা বেশি'],
  },

  // ════════════════════════════════════
  // ১৭. শিম
  // ════════════════════════════════════
  'shim': {
    id: 'shim',
    name: 'শিম',
    nameEn: 'Bean',
    icon: '🌿',
    iconImage: beanIcon,
    category: 'সবজি',
    seasons: ['রবি'],
    plantingMonths: [8, 9, 10],
    harvestMonths: [11, 12, 1, 2],
    totalDays: 90,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ'],
    waterRequirement: 'কম',
    irrigationNeeded: false,
    phRange: { min: 6.0, max: 7.5 },
    seedCostPerBigha: 1000,
    fertilizerCost: 2000,
    pesticideCost: 1500,
    laborCost: 5000,
    otherCost: 1000,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 30,
    yieldMax: 60,
    avgMarketPrice: 800,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['পোকার আক্রমণ', 'মাচা না দিলে ফলন কম'],
    varieties: [
      { name: 'বারি শিম-১', type: 'উফশী', daysToHarvest: 85, yieldPerBigha: 45 },
      { name: 'বারি শিম-২', type: 'উফশী', daysToHarvest: 88, yieldPerBigha: 50 },
      { name: 'ঘিকাঞ্চন', type: 'স্থানীয়', daysToHarvest: 90, yieldPerBigha: 40 },
    ],
    stages: [
      { id: 'sowing', name: 'বপন', icon: '🌱', startDay: 0, endDay: 10,
        tasks: [{ title: 'বীজ বপন', type: 'task', urgency: 'জরুরি',
          desc: 'আগস্ট-সেপ্টেম্বরে সারিতে বপন। ৪৫×৩০ সেমি।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 10, endDay: 60,
        tasks: [
          { title: 'মাচা তৈরি', type: 'task', urgency: 'অত্যন্ত জরুরি',
            desc: 'বাঁশের মাচা বা বেড়া।' },
          { title: 'ইউরিয়া প্রয়োগ', type: 'fertilizer', urgency: 'জরুরি',
            desc: '২ কিস্তিতে।' },
        ]
      },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 80, endDay: 90,
        tasks: [{ title: 'শিম তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: '৩-৪ দিন পরপর তুলুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 10, tsp: 8, mop: 8, gypsum: 4, zinc: 0.8 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.05, tsp: 1.05 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'বপনের আগে', items: ['TSP', 'MOP', 'Gypsum', 'Zinc'], note: '' },
        { timing: '২০ দিন পর', items: ['Urea ১/২'], note: '' },
        { timing: 'ফুল আসার সময়', items: ['Urea ১/২'], note: '' },
      ],
      warnings: ['শিম নিজেই নাইট্রোজেন তৈরি করে — ইউরিয়া কম লাগে'],
    },
    calendarEvents: [
      { month: 8, type: 'planting', title: 'বপন', desc: 'আগস্ট-সেপ্টেম্বরে' },
      { month: 11, type: 'harvest', title: 'সংগ্রহ', desc: 'নভেম্বর থেকে' },
    ],
    bestSellingMonths: [11, 12, 1],
    demandLevel: 'বেশি',
    exportPotential: false,
    goodCompanions: ['ভুট্টা', 'শসা'],
    badCompanions: [],
    govtSupport: ['সার ভর্তুকি'],
    tips: ['শিম মাটির উর্বরতা বাড়ায়', 'শীতের শুরুতে দাম বেশি'],
  },

  // ════════════════════════════════════
  // ১৮. বরবটি
  // ════════════════════════════════════
  'borboti': {
    id: 'borboti',
    name: 'বরবটি',
    nameEn: 'Yard Long Bean',
    icon: '🌿',
    iconImage: yardlongBeanIcon,
    category: 'সবজি',
    seasons: ['খরিফ-১', 'রবি'],
    plantingMonths: [2, 3, 8, 9],
    harvestMonths: [4, 5, 10, 11],
    totalDays: 60,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ', 'পলি'],
    waterRequirement: 'কম',
    irrigationNeeded: false,
    phRange: { min: 5.8, max: 7.0 },
    seedCostPerBigha: 800,
    fertilizerCost: 1800,
    pesticideCost: 1200,
    laborCost: 4000,
    otherCost: 700,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 30,
    yieldMax: 55,
    avgMarketPrice: 700,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['জাব পোকা'],
    varieties: [
      { name: 'বারি বরবটি-১', type: 'উফশী', daysToHarvest: 55, yieldPerBigha: 40 },
      { name: 'বারি বরবটি-২', type: 'উফশী', daysToHarvest: 58, yieldPerBigha: 48 },
    ],
    stages: [
      { id: 'sowing', name: 'বপন', icon: '🌱', startDay: 0, endDay: 7,
        tasks: [{ title: 'বীজ বপন', type: 'task', urgency: 'জরুরি',
          desc: 'সারিতে ৪৫×৩০ সেমি। মাচায় চাষ করলে ভালো।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 7, endDay: 40,
        tasks: [
          { title: 'মাচা বা খুঁটি', type: 'task', urgency: 'জরুরি',
            desc: 'লতানো গাছ — সাপোর্ট দিন।' },
          { title: 'জাব পোকা দমন', type: 'pest', urgency: 'জরুরি',
            desc: 'ডায়ামেথোয়েট বা নিম তেল।' },
        ]
      },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 50, endDay: 60,
        tasks: [{ title: 'বরবটি তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: '২-৩ দিন পরপর তুলুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 8, tsp: 7, mop: 7, gypsum: 4, zinc: 0.6 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.05, tsp: 1.05 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'বপনের আগে', items: ['TSP', 'MOP', 'Gypsum', 'Zinc'], note: '' },
        { timing: '১৫ দিন পর', items: ['Urea ১/২'], note: '' },
        { timing: 'ফুল আসার সময়', items: ['Urea ১/২'], note: '' },
      ],
      warnings: ['ডাল জাতীয় ফসল — ইউরিয়া কম লাগে'],
    },
    calendarEvents: [
      { month: 2, type: 'planting', title: 'রবি বপন', desc: 'ফেব্রুয়ারিতে' },
      { month: 8, type: 'planting', title: 'বর্ষা বপন', desc: 'আগস্টে' },
      { month: 4, type: 'harvest', title: 'সংগ্রহ', desc: 'এপ্রিলে' },
    ],
    bestSellingMonths: [4, 5, 10],
    demandLevel: 'মাঝারি',
    exportPotential: false,
    goodCompanions: ['শসা', 'ভুট্টা'],
    badCompanions: [],
    govtSupport: ['সার ভর্তুকি'],
    tips: ['সবচেয়ে দ্রুত ফসল — ৬০ দিনে তোলা যায়', 'গরমে বেশি উৎপাদন হয়'],
  },

  // ════════════════════════════════════
  // ১৯. আলু (from prev data)
  // ════════════════════════════════════
  'alu': {
    id: 'alu',
    name: 'আলু',
    nameEn: 'Potato',
    icon: '🥔',
    category: 'কন্দাল',
    seasons: ['রবি'],
    plantingMonths: [10, 11],
    harvestMonths: [1, 2, 3],
    totalDays: 100,
    soilTypes: ['বেলে-দোআঁশ', 'দোআঁশ'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 5.2, max: 6.4 },
    seedCostPerBigha: 8000,
    fertilizerCost: 4000,
    pesticideCost: 3000,
    laborCost: 8000,
    otherCost: 2000,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 80,
    yieldMax: 130,
    avgMarketPrice: 500,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'মাঝারি',
    riskFactors: ['Late Blight সবচেয়ে বড় ঝুঁকি', 'বীজ আলুর দাম বেশি', 'কোল্ড স্টোরেজ না থাকলে দাম কম'],
    varieties: [
      { name: 'ডায়মন্ট', type: 'উফশী', daysToHarvest: 90, yieldPerBigha: 100, special: 'সবচেয়ে জনপ্রিয়' },
      { name: 'কার্ডিনাল', type: 'উফশী', daysToHarvest: 95, yieldPerBigha: 110 },
      { name: 'গ্রানোলা', type: 'উফশী', daysToHarvest: 92, yieldPerBigha: 105 },
      { name: 'বারি আলু-৭', type: 'উফশী', daysToHarvest: 90, yieldPerBigha: 95 },
    ],
    stages: [
      { id: 'seed-prep', name: 'বীজ প্রস্তুতি', icon: '🥔', startDay: 0, endDay: 15,
        tasks: [
          { title: 'বীজ আলু নির্বাচন', type: 'preparation', urgency: 'জরুরি',
            desc: '৩০-৫০ গ্রাম সুস্থ বীজ। রোভরাল দিয়ে শোধন।' },
          { title: 'জমি তৈরি', type: 'preparation', urgency: 'জরুরি',
            desc: '৪-৫ চাষ। গোবর, TSP, MOP, Gypsum, Zinc মেশান।' },
        ]
      },
      { id: 'planting', name: 'বপন', icon: '🌱', startDay: 15, endDay: 25,
        tasks: [{ title: 'বীজ বপন', type: 'task', urgency: 'অত্যন্ত জরুরি',
          desc: 'অক্টোবর-নভেম্বরে। সারি ৬০ সেমি, বীজ ২৫ সেমি। ৮-১০ সেমি গভীরে।' }]
      },
      { id: 'emergence', name: 'গাছ বের হওয়া', icon: '🌿', startDay: 25, endDay: 50,
        tasks: [
          { title: 'আর্লি ব্লাইট দমন', type: 'disease', urgency: 'জরুরি',
            desc: 'ম্যানকোজেব স্প্রে।' },
          { title: 'সেচ', type: 'irrigation', urgency: 'জরুরি',
            desc: 'নিয়মিত সেচ। মাটি শুকালে আলু ছোট।' },
        ]
      },
      { id: 'hilling', name: 'মাটি তোলা', icon: '⛏️', startDay: 45, endDay: 60,
        tasks: [
          { title: 'হিলিং', type: 'task', urgency: 'অত্যন্ত জরুরি',
            desc: 'গাছের গোড়ায় মাটি তুলুন।' },
          { title: 'ইউরিয়া ২য় কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'হিলিং এর সময়', desc: '' },
          { title: 'Late Blight দমন', type: 'disease', urgency: 'অত্যন্ত জরুরি',
            desc: 'ম্যানকোজেব + মেটালক্সিল। সবচেয়ে ভয়ংকর রোগ।' },
        ]
      },
      { id: 'harvest-potato', name: 'আলু তোলা', icon: '🧺', startDay: 90, endDay: 100,
        tasks: [
          { title: 'গাছ কাটা', type: 'task', urgency: 'জরুরি',
            timing: '৯০ দিনে', desc: 'মাটির সমান কেটে ১০ দিন রাখুন।' },
          { title: 'আলু তোলা', type: 'harvest', urgency: 'জরুরি',
            desc: 'সকালে তুলুন। বাছাই করে রাখুন।' },
        ]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 22, tsp: 14, mop: 20, gypsum: 8, zinc: 1.5 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, mop: 0.85 },
        'দোআঁশ': { urea: 1.0, mop: 1.0 },
        'বালি':  { urea: 1.1, mop: 1.2 },
        'পলি':   { urea: 0.95, mop: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.05, mop: 1.1 },
      },
      schedule: [
        { timing: 'রোপণের আগে', items: ['TSP', 'MOP ১/২', 'Gypsum', 'Zinc', 'Urea ১/২', 'গোবর ৫০০ কেজি'], note: '' },
        { timing: 'হিলিং এর সময়', items: ['Urea ১/২', 'MOP ১/২'], note: '' },
      ],
      warnings: ['MOP সবচেয়ে গুরুত্বপূর্ণ', 'গোবর সার না দিলে মান কমে'],
    },
    calendarEvents: [
      { month: 10, type: 'planting', title: 'আলু বপন', desc: 'অক্টোবর-নভেম্বরে' },
      { month: 1, type: 'harvest', title: 'আলু তোলা', desc: 'জানুয়ারি-মার্চে' },
    ],
    bestSellingMonths: [3, 4, 5, 6],
    demandLevel: 'বেশি',
    exportPotential: true,
    goodCompanions: ['মিষ্টি কুমড়া'],
    badCompanions: ['টমেটো'],
    govtSupport: ['সার ভর্তুকি', 'কোল্ড স্টোরেজ ভর্তুকি'],
    tips: ['Late Blight রোধে ৭ দিন পরপর ছত্রাকনাশক দিন', 'কোল্ড স্টোরেজে রাখলে ৩ গুণ বেশি দাম পাওয়া যায়'],
  },

  // ════════════════════════════════════
  // ২০. সরিষা (from prev data)
  // ════════════════════════════════════
  'shorisha': {
    id: 'shorisha',
    name: 'সরিষা',
    nameEn: 'Mustard',
    icon: '🌼',
    iconImage: mustardIcon,
    category: 'তেল',
    seasons: ['রবি'],
    plantingMonths: [10, 11],
    harvestMonths: [1, 2],
    totalDays: 80,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ', 'পলি'],
    waterRequirement: 'কম',
    irrigationNeeded: false,
    phRange: { min: 5.8, max: 7.0 },
    seedCostPerBigha: 400,
    fertilizerCost: 2000,
    pesticideCost: 800,
    laborCost: 3500,
    otherCost: 600,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 6,
    yieldMax: 10,
    avgMarketPrice: 3000,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['জাব পোকা', 'ফুল ঝরে যাওয়া'],
    varieties: [
      { name: 'বারি সরিষা-১৪', type: 'উফশী', daysToHarvest: 75, yieldPerBigha: 8, special: 'সর্বোচ্চ ফলন' },
      { name: 'বারি সরিষা-১৭', type: 'উফশী', daysToHarvest: 80, yieldPerBigha: 9 },
      { name: 'টরি-৭', type: 'উফশী', daysToHarvest: 70, yieldPerBigha: 7, special: 'আগাম' },
    ],
    stages: [
      { id: 'sowing', name: 'বপন', icon: '🌱', startDay: 0, endDay: 10,
        tasks: [{ title: 'বীজ বপন', type: 'task', urgency: 'অত্যন্ত জরুরি',
          desc: 'অক্টোবর ১৫ - নভেম্বর ১৫ এর মধ্যে। সারিতে ৩০×১০ সেমি।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 10, endDay: 50,
        tasks: [
          { title: 'ইউরিয়া ২য় কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'বপনের ২৫-৩০ দিন পর', desc: 'ফুল আসার আগে।' },
          { title: 'জাব পোকা দমন', type: 'pest', urgency: 'জরুরি',
            desc: 'ডায়ামেথোয়েট বা ইমিডাক্লোপ্রিড।' },
        ]
      },
      { id: 'harvest', name: 'কাটা', icon: '🧺', startDay: 70, endDay: 80,
        tasks: [{ title: 'সরিষা কাটা', type: 'harvest', urgency: 'জরুরি',
          desc: '৮০% ফল বাদামি হলে কাটুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 14, tsp: 8, mop: 7, gypsum: 8, zinc: 0.8, boron: 0.5 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.1, tsp: 1.1 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'বপনের সময়', items: ['TSP', 'MOP', 'Gypsum', 'Zinc', 'Boron', 'Urea ১/২'], note: 'Basal' },
        { timing: 'বপনের ২৫-৩০ দিন পর', items: ['Urea ১/২'], note: 'ফুল আসার আগে' },
      ],
      warnings: ['Gypsum ও Boron অবশ্যই দিন', 'ফুলের সময় স্প্রে করবেন না'],
    },
    calendarEvents: [
      { month: 10, type: 'planting', title: 'সরিষা বপন', desc: 'অক্টোবরে' },
      { month: 1, type: 'harvest', title: 'সরিষা কাটা', desc: 'জানুয়ারি-ফেব্রুয়ারিতে' },
    ],
    bestSellingMonths: [2, 3, 4],
    demandLevel: 'বেশি',
    exportPotential: false,
    goodCompanions: ['মসুর ডাল', 'গম (পর্যায়ক্রমে)'],
    badCompanions: [],
    govtSupport: ['সার ভর্তুকি', 'তেল ফসল প্রণোদনা'],
    tips: ['সরিষা থেকে খৈল ও তেল দুটোই বিক্রি হয়', 'সময়মতো বপন সবচেয়ে গুরুত্বপূর্ণ'],
  },

  // ════════════════════════════════════
  // ২১. চিনাবাদাম
  // ════════════════════════════════════
  'chinabadaam': {
    id: 'chinabadaam',
    name: 'চিনাবাদাম',
    nameEn: 'Groundnut',
    icon: '🥜',
    category: 'তেল',
    seasons: ['খরিফ-১', 'রবি'],
    plantingMonths: [3, 4, 11],
    harvestMonths: [7, 8, 3],
    totalDays: 110,
    soilTypes: ['বেলে-দোআঁশ', 'পলি'],
    waterRequirement: 'কম',
    irrigationNeeded: false,
    phRange: { min: 6.0, max: 7.0 },
    seedCostPerBigha: 3000,
    fertilizerCost: 1500,
    pesticideCost: 1000,
    laborCost: 5000,
    otherCost: 800,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 8,
    yieldMax: 14,
    avgMarketPrice: 4000,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['টিক্কা রোগ', 'বালু মাটি ছাড়া ভালো হয় না'],
    varieties: [
      { name: 'বারি চিনাবাদাম-৬', type: 'উফশী', daysToHarvest: 105, yieldPerBigha: 11 },
      { name: 'বারি চিনাবাদাম-৮', type: 'উফশী', daysToHarvest: 110, yieldPerBigha: 13 },
    ],
    stages: [
      { id: 'sowing', name: 'বপন', icon: '🌱', startDay: 0, endDay: 10,
        tasks: [{ title: 'বীজ বপন', type: 'task', urgency: 'জরুরি',
          desc: 'মার্চ-এপ্রিলে। সারিতে ৩০×১৫ সেমি।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 10, endDay: 75,
        tasks: [
          { title: 'মাটি আলগা করা', type: 'task', urgency: 'জরুরি',
            desc: 'ফুল মাটিতে ঢোকার সময় মাটি আলগা করুন।' },
          { title: 'টিক্কা রোগ দমন', type: 'disease', urgency: 'জরুরি',
            desc: 'ম্যানকোজেব স্প্রে।' },
        ]
      },
      { id: 'harvest', name: 'তোলা', icon: '🧺', startDay: 100, endDay: 110,
        tasks: [{ title: 'চিনাবাদাম তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: 'পাতা হলুদ হলে তুলুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 5, tsp: 10, mop: 8, gypsum: 10, zinc: 0.8 },
      soilAdjustment: {
        'এঁটেল': { urea: 1.0, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.0, tsp: 1.0 },
        'পলি':   { urea: 1.0, tsp: 1.0 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'বপনের সময়', items: ['TSP', 'MOP', 'Gypsum', 'Zinc', 'Urea সম্পূর্ণ'], note: 'ডাল জাতীয় — ইউরিয়া কম' },
      ],
      warnings: ['Gypsum অবশ্যই দিন — বাদাম বড় হবে', 'ডাল ফসল — ইউরিয়া খুব কম লাগে'],
    },
    calendarEvents: [
      { month: 3, type: 'planting', title: 'বপন', desc: 'মার্চ-এপ্রিলে' },
      { month: 7, type: 'harvest', title: 'তোলা', desc: 'জুলাই-আগস্টে' },
    ],
    bestSellingMonths: [8, 9, 10],
    demandLevel: 'মাঝারি',
    exportPotential: false,
    goodCompanions: ['ভুট্টা', 'সূর্যমুখী'],
    badCompanions: [],
    govtSupport: ['সার ভর্তুকি', 'তেল ফসল প্রণোদনা'],
    tips: ['বালু মাটিতে সবচেয়ে ভালো হয়', 'Gypsum দেওয়া আবশ্যিক'],
  },

  // ════════════════════════════════════
  // ২২. তিল
  // ════════════════════════════════════
  'til': {
    id: 'til',
    name: 'তিল',
    nameEn: 'Sesame',
    icon: '🌿',
    iconImage: sesameIcon,
    category: 'তেল',
    seasons: ['খরিফ-১'],
    plantingMonths: [3, 4],
    harvestMonths: [6, 7],
    totalDays: 90,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ'],
    waterRequirement: 'কম',
    irrigationNeeded: false,
    phRange: { min: 5.4, max: 6.7 },
    seedCostPerBigha: 300,
    fertilizerCost: 1200,
    pesticideCost: 600,
    laborCost: 3000,
    otherCost: 500,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 3,
    yieldMax: 6,
    avgMarketPrice: 8000,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['ফাইটোফথোরা', 'অতিবৃষ্টিতে ক্ষতি'],
    varieties: [
      { name: 'বারি তিল-৩', type: 'উফশী', daysToHarvest: 85, yieldPerBigha: 4.5 },
      { name: 'বারি তিল-৪', type: 'উফশী', daysToHarvest: 88, yieldPerBigha: 5.5, special: 'সর্বোচ্চ ফলন' },
    ],
    stages: [
      { id: 'sowing', name: 'বপন', icon: '🌱', startDay: 0, endDay: 7,
        tasks: [{ title: 'বীজ বপন', type: 'task', urgency: 'জরুরি',
          desc: 'মার্চ-এপ্রিলে। সারিতে ৩০×১০ সেমি। ছিটিয়ে বা সারিতে।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 7, endDay: 65,
        tasks: [
          { title: 'পাতলা করা', type: 'task', urgency: 'জরুরি',
            desc: 'বেশি চারা থাকলে পাতলা করুন।' },
          { title: 'ইউরিয়া প্রয়োগ', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'বপনের ২০-২৫ দিন পর', desc: '' },
        ]
      },
      { id: 'harvest', name: 'কাটা', icon: '🧺', startDay: 80, endDay: 90,
        tasks: [{ title: 'তিল কাটা', type: 'harvest', urgency: 'জরুরি',
          desc: 'নিচের বাকল হলুদ হলে কাটুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 10, tsp: 6, mop: 5, gypsum: 5, zinc: 0.6 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.05, tsp: 1.05 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'বপনের আগে', items: ['TSP', 'MOP', 'Gypsum', 'Urea ১/২'], note: '' },
        { timing: 'বপনের ২০-২৫ দিন পর', items: ['Urea ১/২'], note: '' },
      ],
      warnings: ['পানি জমলে ক্ষতি হয়'],
    },
    calendarEvents: [
      { month: 3, type: 'planting', title: 'তিল বপন', desc: 'মার্চ-এপ্রিলে' },
      { month: 6, type: 'harvest', title: 'তিল কাটা', desc: 'জুন-জুলাইতে' },
    ],
    bestSellingMonths: [7, 8],
    demandLevel: 'মাঝারি',
    exportPotential: true,
    goodCompanions: ['ভুট্টা', 'জোয়ার'],
    badCompanions: [],
    govtSupport: ['তেল ফসল প্রণোদনা'],
    tips: ['খরচ সবচেয়ে কম', 'তিলের তেলের দাম বেশি'],
  },

  // ════════════════════════════════════
  // ২৩. সূর্যমুখী
  // ════════════════════════════════════
  'surjomukhi': {
    id: 'surjomukhi',
    name: 'সূর্যমুখী',
    nameEn: 'Sunflower',
    icon: '🌻',
    category: 'তেল',
    seasons: ['রবি', 'খরিফ-১'],
    plantingMonths: [10, 11, 2, 3],
    harvestMonths: [2, 3, 5, 6],
    totalDays: 100,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.5 },
    seedCostPerBigha: 1000,
    fertilizerCost: 2500,
    pesticideCost: 1000,
    laborCost: 4500,
    otherCost: 800,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 8,
    yieldMax: 14,
    avgMarketPrice: 3500,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['পাখির আক্রমণ', 'ডাউনি মিলডিউ'],
    varieties: [
      { name: 'বারি সূর্যমুখী-২', type: 'উফশী', daysToHarvest: 95, yieldPerBigha: 10 },
      { name: 'বারি সূর্যমুখী-৩', type: 'উফশী', daysToHarvest: 100, yieldPerBigha: 13 },
    ],
    stages: [
      { id: 'sowing', name: 'বপন', icon: '🌱', startDay: 0, endDay: 10,
        tasks: [{ title: 'বপন', type: 'task', urgency: 'জরুরি',
          desc: 'অক্টোবর-নভেম্বরে। ৬০×৩০ সেমি দূরত্বে।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 10, endDay: 65,
        tasks: [
          { title: 'ইউরিয়া ১ম কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: '২০ দিন পর', desc: '' },
          { title: 'ইউরিয়া ২য় কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'ফুল আসার আগে', desc: '' },
        ]
      },
      { id: 'flowering', name: 'ফুল', icon: '🌻', startDay: 65, endDay: 85,
        tasks: [
          { title: 'পাখি তাড়ানো', type: 'pest', urgency: 'জরুরি',
            desc: 'জাল বা ভয় দেখানোর ব্যবস্থা।' },
          { title: 'কৃত্রিম পরাগায়ন', type: 'task', urgency: 'সাধারণ',
            desc: 'মৌমাছি না থাকলে হাতে পরাগায়ন।' },
        ]
      },
      { id: 'harvest', name: 'কাটা', icon: '🧺', startDay: 95, endDay: 100,
        tasks: [{ title: 'সূর্যমুখী কাটা', type: 'harvest', urgency: 'জরুরি',
          desc: 'ফুলের পেছন বাদামি হলে কাটুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 16, tsp: 10, mop: 9, gypsum: 7, zinc: 1.0, boron: 0.5 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.1, tsp: 1.05 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'বপনের সময়', items: ['TSP', 'MOP ১/২', 'Gypsum', 'Zinc', 'Boron', 'Urea ১/৩'], note: '' },
        { timing: '২০-২৫ দিন পর', items: ['Urea ১/৩', 'MOP ১/২'], note: '' },
        { timing: 'ফুল আসার আগে', items: ['Urea ১/৩'], note: '' },
      ],
      warnings: ['Boron দিন', 'পাখির আক্রমণ থেকে রক্ষা করুন'],
    },
    calendarEvents: [
      { month: 10, type: 'planting', title: 'বপন', desc: 'অক্টোবরে' },
      { month: 2, type: 'harvest', title: 'কাটা', desc: 'ফেব্রুয়ারি-মার্চে' },
    ],
    bestSellingMonths: [3, 4],
    demandLevel: 'মাঝারি',
    exportPotential: false,
    goodCompanions: ['চিনাবাদাম'],
    badCompanions: [],
    govtSupport: ['তেল ফসল প্রণোদনা'],
    tips: ['সূর্যমুখী তেলের চাহিদা বাড়ছে', 'মৌমাছি পরাগায়নে সাহায্য করে'],
  },

  // ════════════════════════════════════
  // ২৪. আদা
  // ════════════════════════════════════
  'ada': {
    id: 'ada',
    name: 'আদা',
    nameEn: 'Ginger',
    icon: '🫚',
    category: 'মসলা',
    seasons: ['খরিফ-১'],
    plantingMonths: [3, 4],
    harvestMonths: [11, 12],
    totalDays: 240,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 5.6, max: 6.5 },
    seedCostPerBigha: 12000,
    fertilizerCost: 3000,
    pesticideCost: 2000,
    laborCost: 8000,
    otherCost: 2000,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 50,
    yieldMax: 100,
    avgMarketPrice: 2500,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'মাঝারি',
    riskFactors: ['রাইজোম রট', 'বীজ আদার দাম বেশি', 'দীর্ঘ সময় লাগে'],
    varieties: [
      { name: 'বারি আদা-১', type: 'উফশী', daysToHarvest: 235, yieldPerBigha: 70 },
      { name: 'বারি আদা-২', type: 'উফশী', daysToHarvest: 240, yieldPerBigha: 85 },
    ],
    stages: [
      { id: 'planting', name: 'রোপণ', icon: '🌱', startDay: 0, endDay: 20,
        tasks: [
          { title: 'বীজ শোধন', type: 'preparation', urgency: 'জরুরি',
            desc: 'ম্যানকোজেব দ্রবণে ৩০ মিনিট ভিজিয়ে শোধন।' },
          { title: 'রোপণ', type: 'task', urgency: 'জরুরি',
            desc: 'মার্চ-এপ্রিলে। ৩০×২০ সেমি দূরত্বে। আংশিক ছায়ায় ভালো হয়।' },
        ]
      },
      { id: 'vegetative', name: 'দীর্ঘ বৃদ্ধি', icon: '🌿', startDay: 20, endDay: 200,
        tasks: [
          { title: 'ইউরিয়া প্রয়োগ', type: 'fertilizer', urgency: 'জরুরি',
            desc: '৩ কিস্তিতে।' },
          { title: 'মাটি তোলা', type: 'task', urgency: 'জরুরি',
            desc: '৬০ ও ১২০ দিনে গাছের গোড়ায় মাটি তুলুন।' },
          { title: 'রাইজোম রট দমন', type: 'disease', urgency: 'অত্যন্ত জরুরি',
            desc: 'হলুদ হলে তুলে ফেলুন। কপার অক্সিক্লোরাইড দিন।' },
        ]
      },
      { id: 'harvest', name: 'তোলা', icon: '🧺', startDay: 230, endDay: 240,
        tasks: [{ title: 'আদা তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: 'নভেম্বর-ডিসেম্বরে পাতা হলুদ হলে তুলুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 18, tsp: 9, mop: 12, gypsum: 6, zinc: 1.0 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.05, tsp: 1.0 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'রোপণের সময়', items: ['TSP', 'MOP ১/৩', 'Gypsum', 'Zinc', 'গোবর ৪০০ কেজি'], note: '' },
        { timing: '৬০ দিন পর', items: ['Urea ১/২', 'MOP ১/৩'], note: '' },
        { timing: '১২০ দিন পর', items: ['Urea ১/২', 'MOP ১/৩'], note: '' },
      ],
      warnings: ['রাইজোম রট সবচেয়ে বড় সমস্যা', 'পানি জমলে দ্রুত পচে'],
    },
    calendarEvents: [
      { month: 3, type: 'planting', title: 'আদা রোপণ', desc: 'মার্চ-এপ্রিলে' },
      { month: 11, type: 'harvest', title: 'আদা তোলা', desc: 'নভেম্বর-ডিসেম্বরে' },
    ],
    bestSellingMonths: [12, 1, 2],
    demandLevel: 'বেশি',
    exportPotential: true,
    goodCompanions: ['হলুদ'],
    badCompanions: [],
    govtSupport: ['মসলা ফসল প্রণোদনা'],
    tips: ['আদায় বিনিয়োগ বেশি কিন্তু লাভও বেশি', 'ছায়াযুক্ত জমিতে ভালো হয়'],
  },

  // ════════════════════════════════════
  // ২৫. হলুদ
  // ════════════════════════════════════
  'holud': {
    id: 'holud',
    name: 'হলুদ',
    nameEn: 'Turmeric',
    icon: '🌿',
    iconImage: turmericIcon,
    category: 'মসলা',
    seasons: ['খরিফ-১'],
    plantingMonths: [3, 4],
    harvestMonths: [1, 2, 3],
    totalDays: 270,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 5.0, max: 7.5 },
    seedCostPerBigha: 8000,
    fertilizerCost: 2500,
    pesticideCost: 1500,
    laborCost: 7000,
    otherCost: 1500,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 60,
    yieldMax: 100,
    avgMarketPrice: 1500,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'কম',
    riskFactors: ['পাতা পচা রোগ', 'দীর্ঘ মৌসুম'],
    varieties: [
      { name: 'বারি হলুদ-১', type: 'উফশী', daysToHarvest: 265, yieldPerBigha: 75 },
      { name: 'বারি হলুদ-২', type: 'উফশী', daysToHarvest: 270, yieldPerBigha: 90 },
      { name: 'স্থানীয় মুরাদাবাদী', type: 'স্থানীয়', daysToHarvest: 280, yieldPerBigha: 70 },
    ],
    stages: [
      { id: 'planting', name: 'রোপণ', icon: '🌱', startDay: 0, endDay: 20,
        tasks: [{ title: 'রাইজোম রোপণ', type: 'task', urgency: 'জরুরি',
          desc: 'মার্চ-এপ্রিলে। ৩০×২০ সেমি। আদার মতোই রোপণ।' }]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 20, endDay: 220,
        tasks: [
          { title: 'মাটি তোলা', type: 'task', urgency: 'জরুরি',
            desc: '৬০ ও ১২০ দিনে মাটি তোলা।' },
          { title: 'পাতা পচা দমন', type: 'disease', urgency: 'জরুরি',
            desc: 'কপার অক্সিক্লোরাইড।' },
        ]
      },
      { id: 'harvest', name: 'তোলা', icon: '🧺', startDay: 260, endDay: 270,
        tasks: [{ title: 'হলুদ তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: 'পাতা হলুদ হলে তুলুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 15, tsp: 8, mop: 10, gypsum: 5, zinc: 0.8 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.05, tsp: 1.0 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.0, tsp: 1.0 },
      },
      schedule: [
        { timing: 'রোপণের সময়', items: ['TSP', 'MOP ১/২', 'Gypsum', 'Zinc', 'গোবর ৪০০ কেজি'], note: '' },
        { timing: '৬০ দিন পর', items: ['Urea ১/২', 'MOP ১/২'], note: '' },
        { timing: '১২০ দিন পর', items: ['Urea ১/২'], note: '' },
      ],
      warnings: ['পানি জমলে রোগ হয়'],
    },
    calendarEvents: [
      { month: 3, type: 'planting', title: 'হলুদ রোপণ', desc: 'মার্চ-এপ্রিলে' },
      { month: 1, type: 'harvest', title: 'হলুদ তোলা', desc: 'জানুয়ারি-মার্চে' },
    ],
    bestSellingMonths: [2, 3, 4],
    demandLevel: 'বেশি',
    exportPotential: true,
    goodCompanions: ['আদা'],
    badCompanions: [],
    govtSupport: ['মসলা ফসল প্রণোদনা'],
    tips: ['হলুদ শুকিয়ে বিক্রি করলে দাম বেশি', 'ছায়ায় ভালো হয়'],
  },

  // ════════════════════════════════════
  // ২৬. পেঁয়াজ (from prev data)
  // ════════════════════════════════════
  'peyaj': {
    id: 'peyaj',
    name: 'পেঁয়াজ',
    nameEn: 'Onion',
    icon: '🧅',
    category: 'মসলা',
    seasons: ['রবি'],
    plantingMonths: [11, 12, 1],
    harvestMonths: [3, 4],
    totalDays: 120,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.5 },
    seedCostPerBigha: 2000,
    fertilizerCost: 3000,
    pesticideCost: 2500,
    laborCost: 7000,
    otherCost: 1500,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 40,
    yieldMax: 70,
    avgMarketPrice: 2000,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'মাঝারি',
    riskFactors: ['দাম অস্থির', 'থ্রিপস ও পার্পল ব্লচ রোগ', 'বেশি N দিলে কন্দ ছোট'],
    varieties: [
      { name: 'বারি পেঁয়াজ-১', type: 'উফশী', daysToHarvest: 115, yieldPerBigha: 50 },
      { name: 'বারি পেঁয়াজ-২', type: 'উফশী', daysToHarvest: 120, yieldPerBigha: 60 },
      { name: 'বারি পেঁয়াজ-৫', type: 'উফশী', daysToHarvest: 110, yieldPerBigha: 55, special: 'গ্রীষ্মকালীন' },
    ],
    stages: [
      { id: 'seedbed', name: 'বীজতলা', icon: '🌱', startDay: 0, endDay: 35,
        tasks: [{ title: 'বীজতলা', type: 'preparation', urgency: 'জরুরি',
          desc: 'অক্টোবর-নভেম্বরে বীজতলা।' }]
      },
      { id: 'transplanting', name: 'রোপণ', icon: '🚜', startDay: 35, endDay: 45,
        tasks: [
          { title: 'চারা রোপণ', type: 'task', urgency: 'জরুরি',
            desc: '৩৫-৪০ দিনের চারা। বেডে ১০×১০ সেমি। ৩-৪ সেমি গভীরে।' },
          { title: 'বেসাল সার', type: 'fertilizer', urgency: 'জরুরি',
            desc: 'TSP, MOP, Gypsum, Zinc, গোবর রোপণের আগে।' },
        ]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 45, endDay: 90,
        tasks: [
          { title: 'ইউরিয়া ১ম কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'রোপণের ২০-২৫ দিন পর', desc: 'N বেশি দেবেন না — কন্দ ছোট হবে।' },
          { title: 'থ্রিপস দমন', type: 'pest', urgency: 'অত্যন্ত জরুরি',
            desc: 'ইমিডাক্লোপ্রিড বা Spinosad।' },
          { title: 'পার্পল ব্লচ দমন', type: 'disease', urgency: 'জরুরি',
            desc: 'ম্যানকোজেব বা কপার।' },
        ]
      },
      { id: 'bulbing', name: 'কন্দ বাঁধা', icon: '🧅', startDay: 90, endDay: 115,
        tasks: [
          { title: 'ইউরিয়া ২য় কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'রোপণের ৪০-৪৫ দিন পর', desc: 'কন্দ বড় হওয়ার সময়।' },
          { title: 'সেচ বন্ধ', type: 'irrigation', urgency: 'জরুরি',
            timing: 'তোলার ১৫ দিন আগে',
            desc: 'কন্দ বাঁধার পর সেচ বন্ধ করুন। শুকিয়ে তুলুন।' },
        ]
      },
      { id: 'harvest', name: 'তোলা', icon: '🧺', startDay: 115, endDay: 120,
        tasks: [{ title: 'পেঁয়াজ তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: 'গাছ হলুদ হয়ে হেলে পড়লে তুলুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 18, tsp: 9, mop: 10, gypsum: 5, zinc: 1.0 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.15, tsp: 1.1 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.05, tsp: 1.0 },
      },
      schedule: [
        { timing: 'রোপণের আগে', items: ['TSP', 'MOP ১/২', 'Gypsum', 'Zinc', 'Urea ১/৩', 'গোবর ৩০০ কেজি'], note: '' },
        { timing: 'রোপণের ২০-২৫ দিন পর', items: ['Urea ১/৩', 'MOP ১/২'], note: '' },
        { timing: 'রোপণের ৪০-৪৫ দিন পর', items: ['Urea ১/৩'], note: 'কন্দ বড় হওয়ার সময়' },
      ],
      warnings: ['বেশি N দিলে পাতা বাড়ে কন্দ ছোট থাকে', 'তোলার আগে সেচ বন্ধ করুন'],
    },
    calendarEvents: [
      { month: 10, type: 'planting', title: 'বীজতলা', desc: 'অক্টোবরে' },
      { month: 12, type: 'planting', title: 'রোপণ', desc: 'ডিসেম্বরে মাঠে' },
      { month: 3, type: 'harvest', title: 'তোলা', desc: 'মার্চ-এপ্রিলে' },
    ],
    bestSellingMonths: [5, 6, 7, 10, 11],
    demandLevel: 'বেশি',
    exportPotential: true,
    goodCompanions: ['টমেটো', 'গাজর'],
    badCompanions: ['মটরশুটি', 'ডাল'],
    govtSupport: ['সার ভর্তুকি', 'মসলা প্রণোদনা'],
    tips: ['দাম অস্থির — কোল্ড স্টোরেজে রাখলে লাভ বেশি', 'থ্রিপস দমন সবচেয়ে গুরুত্বপূর্ণ'],
  },

  // ════════════════════════════════════
  // ২৭. রসুন
  // ════════════════════════════════════
  'roshun': {
    id: 'roshun',
    name: 'রসুন',
    nameEn: 'Garlic',
    icon: '🧄',
    category: 'মসলা',
    seasons: ['রবি'],
    plantingMonths: [10, 11],
    harvestMonths: [2, 3],
    totalDays: 130,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ'],
    waterRequirement: 'মাঝারি',
    irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.0 },
    seedCostPerBigha: 10000,
    fertilizerCost: 3000,
    pesticideCost: 2000,
    laborCost: 7000,
    otherCost: 1500,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 25,
    yieldMax: 45,
    avgMarketPrice: 5000,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'মাঝারি',
    riskFactors: ['বীজ রসুনের দাম বেশি', 'পার্পল ব্লচ', 'উঁচু জমি দরকার'],
    varieties: [
      { name: 'বারি রসুন-১', type: 'উফশী', daysToHarvest: 125, yieldPerBigha: 30 },
      { name: 'বারি রসুন-২', type: 'উফশী', daysToHarvest: 130, yieldPerBigha: 38 },
      { name: 'দেশি রসুন', type: 'স্থানীয়', daysToHarvest: 135, yieldPerBigha: 25, special: 'ঝাঁজ বেশি' },
    ],
    stages: [
      { id: 'planting', name: 'রোপণ', icon: '🌱', startDay: 0, endDay: 15,
        tasks: [
          { title: 'কোয়া আলাদা করা', type: 'preparation', urgency: 'জরুরি',
            desc: 'সুস্থ কোয়া বাছাই করুন। রোপণের ১ সপ্তাহ আগে।' },
          { title: 'রোপণ', type: 'task', urgency: 'জরুরি',
            desc: 'অক্টোবর-নভেম্বরে। ২০×১০ সেমি। উঁচু বেডে।' },
        ]
      },
      { id: 'vegetative', name: 'বৃদ্ধি', icon: '🌿', startDay: 15, endDay: 90,
        tasks: [
          { title: 'ইউরিয়া ১ম কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'রোপণের ২৫-৩০ দিন পর', desc: '' },
          { title: 'পার্পল ব্লচ দমন', type: 'disease', urgency: 'জরুরি',
            desc: 'ম্যানকোজেব।' },
          { title: 'বোরন দেওয়া', type: 'fertilizer', urgency: 'জরুরি',
            desc: 'Boron না দিলে কোয়া ছোট থাকে।' },
        ]
      },
      { id: 'bulbing', name: 'কন্দ গঠন', icon: '🧄', startDay: 90, endDay: 120,
        tasks: [
          { title: 'ইউরিয়া ২য় কিস্তি', type: 'fertilizer', urgency: 'জরুরি',
            timing: 'রোপণের ৫০-৫৫ দিন পর', desc: '' },
          { title: 'সেচ বন্ধ', type: 'irrigation', urgency: 'জরুরি',
            timing: 'তোলার ১৫ দিন আগে', desc: 'শুকিয়ে তুলুন।' },
        ]
      },
      { id: 'harvest', name: 'তোলা', icon: '🧺', startDay: 125, endDay: 130,
        tasks: [{ title: 'রসুন তোলা', type: 'harvest', urgency: 'জরুরি',
          desc: 'পাতা হলুদ হলে তুলুন।' }]
      },
    ],
    fertilizerGuide: {
      perBigha: { urea: 16, tsp: 9, mop: 10, gypsum: 5, zinc: 1.0, boron: 0.4 },
      soilAdjustment: {
        'এঁটেল': { urea: 0.9, tsp: 0.9 },
        'দোআঁশ': { urea: 1.0, tsp: 1.0 },
        'বালি':  { urea: 1.1, tsp: 1.1 },
        'পলি':   { urea: 0.9, tsp: 0.95 },
        'বেলে-দোআঁশ': { urea: 1.05, tsp: 1.0 },
      },
      schedule: [
        { timing: 'রোপণের আগে', items: ['TSP', 'MOP ১/২', 'Gypsum', 'Zinc', 'Boron', 'Urea ১/৩'], note: '' },
        { timing: '২৫-৩০ দিন পর', items: ['Urea ১/৩', 'MOP ১/২'], note: '' },
        { timing: '৫০-৫৫ দিন পর', items: ['Urea ১/৩'], note: '' },
      ],
      warnings: ['Boron অবশ্যই দিন', 'উঁচু জমিতে চাষ করুন'],
    },
    calendarEvents: [
      { month: 10, type: 'planting', title: 'রসুন রোপণ', desc: 'অক্টোবর-নভেম্বরে' },
      { month: 2, type: 'harvest', title: 'রসুন তোলা', desc: 'ফেব্রুয়ারি-মার্চে' },
    ],
    bestSellingMonths: [4, 5, 6, 10, 11],
    demandLevel: 'বেশি',
    exportPotential: true,
    goodCompanions: ['টমেটো', 'গোলাপ (পোকা দূরে রাখে)'],
    badCompanions: ['মটরশুটি'],
    govtSupport: ['সার ভর্তুকি', 'মসলা প্রণোদনা'],
    tips: ['বীজ রসুন ব্যয়বহুল — ভালো উৎস থেকে কিনুন', 'শুকিয়ে বিক্রি করলে দাম বেশি'],
  },
  // Papaya: cultivation reference https://www.bamis.gov.bd/en/crops/view/67/
  // Budget, yield and land-based fertilizer mapping are preliminary estimates.
  'papaya': {
    id: 'papaya', name: 'পেঁপে', nameEn: 'Papaya', icon: '🌿', iconImage: papayaIcon,
    category: 'সবজি', seasons: ['সারা বছর'],
    plantingMonths: [2, 3, 9, 10], harvestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    totalDays: 365, soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ'],
    waterRequirement: 'মাঝারি', irrigationNeeded: true, phRange: { min: 6.0, max: 7.0 },
    seedCostPerBigha: 6000, fertilizerCost: 10000, pesticideCost: 3000, laborCost: 12000, otherCost: 4000,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 100, yieldMax: 180, avgMarketPrice: 600,
    get profitMin() { return this.yieldMin * this.avgMarketPrice - this.totalCost },
    get profitMax() { return this.yieldMax * this.avgMarketPrice - this.totalCost },
    get roi() { return Math.round((this.profitMin + this.profitMax) / 2 / this.totalCost * 100) },
    riskLevel: 'মাঝারি', riskFactors: ['জলাবদ্ধতায় গোড়া পচা', 'রিং স্পট ভাইরাস ও মিলিবাগ', 'ঝড়ে গাছ ভেঙে যাওয়া'],
    varieties: [{ name: 'বারি পেঁপে-১ (শাহী)', type: 'উফশী', daysToHarvest: 270, yieldPerBigha: 140 }],
    stages: [
      { id: 'planting', name: 'চারা রোপণ', icon: '🌱', startDay: 0, endDay: 30, tasks: [
        { title: 'জমি ও গর্ত প্রস্তুত', type: 'preparation', urgency: 'জরুরি', desc: 'পানি নিষ্কাশনযোগ্য উঁচু জমিতে প্রায় ২×২ মিটার দূরত্বে গর্ত তৈরি করুন। পচা জৈব সার মাটিতে মিশিয়ে রোপণের আগে প্রস্তুত রাখুন।' },
        { title: 'সুস্থ চারা রোপণ', type: 'task', urgency: 'জরুরি', desc: '৪০–৫০ দিনের সুস্থ চারা লাগান। গোড়ায় পানি জমতে দেবেন না। এই পরিকল্পনায় দিন গণনা মাঠে চারা রোপণ থেকে।' },
      ] },
      { id: 'vegetative', name: 'গাছের বৃদ্ধি', icon: '🌿', startDay: 30, endDay: 100, tasks: [
        { title: 'কিস্তিতে সার প্রয়োগ', type: 'fertilizer', urgency: 'জরুরি', desc: 'গাছের বয়স ও মাটি পরীক্ষার ভিত্তিতে সার ভাগ করে দিন; কাণ্ডের গায়ে সার লাগাবেন না।' },
        { title: 'মিলিবাগ পর্যবেক্ষণ', type: 'pest', urgency: 'জরুরি', desc: 'পাতার নিচে ও কাণ্ডে সাদা তুলার মতো পোকা দেখুন। আক্রান্ত অংশ সরান ও স্থানীয় কৃষি কর্মকর্তার পরামর্শ নিন।' },
        { title: 'সেচ ও নালা পরিষ্কার', type: 'irrigation', urgency: 'জরুরি', desc: 'মাটি শুকালে হালকা সেচ দিন; বৃষ্টির পানি দ্রুত বের করুন।' },
      ] },
      { id: 'flowering', name: 'ফুল ও ফল ধরা', icon: '🌸', startDay: 100, endDay: 180, tasks: [
        { title: 'ফুল ও পরাগায়ন পর্যবেক্ষণ', type: 'task', urgency: 'সাধারণ', desc: 'জাত অনুযায়ী পুরুষ ও স্ত্রী গাছ শনাক্ত করুন; পরাগায়নের জন্য প্রয়োজনীয় পুরুষ গাছ রাখুন।' },
        { title: 'রিং স্পট ভাইরাস পর্যবেক্ষণ', type: 'disease', urgency: 'জরুরি', desc: 'ফলে বলয় দাগ, মোজাইক বা পাতা বিকৃত হলে রোগ নিশ্চিত করুন। ভাইরাসে আক্রান্ত গাছ আলাদা করুন; ভাইরাস সারাতে ছত্রাকনাশক ব্যবহার করবেন না।' },
      ] },
      { id: 'fruit-growth', name: 'ফল বড় হওয়া', icon: '🌿', startDay: 180, endDay: 270, tasks: [
        { title: 'গাছের খুঁটি ও ফল পরিচর্যা', type: 'task', urgency: 'জরুরি', desc: 'ঝড়ের আগে খুঁটি দিন। রোগাক্রান্ত ফল সরান; কাঁচা সবজি হিসেবে উপযুক্ত পূর্ণ আকারের ফল সংগ্রহ করা যায়।' },
        { title: 'গোড়া পচা পর্যবেক্ষণ', type: 'disease', urgency: 'জরুরি', desc: 'গোড়া নরম বা পাতা ঢলে পড়লে পানি নিষ্কাশন করুন ও রোগ নির্ণয়ের পর ব্যবস্থা নিন।' },
      ] },
      { id: 'harvest', name: 'ফল সংগ্রহ ও চলমান পরিচর্যা', icon: '🧺', startDay: 270, endDay: 365, tasks: [
        { title: 'পাকা পেঁপে সংগ্রহ', type: 'harvest', urgency: 'জরুরি', desc: 'ফলের গায়ে হলুদ রং দেখা দিলে বাজারের দূরত্ব অনুযায়ী সংগ্রহ করুন। সাধারণত রোপণের ৮–৯ মাসে পাকা ফল শুরু; জাত ও আবহাওয়ায় সময় বদলায়।' },
        { title: 'চলমান সংগ্রহ ও পরিচর্যা', type: 'post-harvest', urgency: 'সাধারণ', desc: 'ফল নরম না করে পরিষ্কার ঝুড়িতে রাখুন। এক বছর এই পরিকল্পনার সময়সীমা; গাছ ফল দেওয়া বন্ধ হওয়ার নির্দিষ্ট সময় নয়।' },
      ] },
    ],
    fertilizerGuide: {
      // Approx. 330 plants/bigha at 2×2 m spacing. Not an official land-based dose mapping.
      perBigha: { urea: 148.5, tsp: 165, mop: 156.75, gypsum: 82.5, zinc: 6.6, boron: 6.6 },
      soilAdjustment: { 'এঁটেল': {}, 'দোআঁশ': {}, 'বালি': {}, 'পলি': {}, 'বেলে-দোআঁশ': {} },
      schedule: [
        { timing: 'গর্ত তৈরির সময়', items: ['পচা জৈব সার', 'মাটি পরীক্ষাভিত্তিক ফসফরাস'], note: 'গাছপ্রতি নির্দেশনা ও গাছসংখ্যা অনুযায়ী হিসাব করুন।' },
        { timing: 'রোপণের পর বৃদ্ধি ও ফলধরা পর্যায়', items: ['ইউরিয়া ও পটাশ কিস্তিতে'], note: 'পুরো পরিমাণ একবারে নয়; গাছের বয়স ও স্থানীয় সুপারিশ অনুযায়ী ভাগ করুন।' },
      ],
      warnings: ['প্রাথমিক হিসাব: ২×২ মিটার দূরত্বে বিঘায় প্রায় ৩৩০ গাছ ধরে প্রথম বছরের আনুমানিক পরিমাণ; official BARC/BARI/BRRI land-based dose mapping নয়।', 'গাছসংখ্যা, বয়স ও মাটি পরীক্ষা অনুযায়ী মাত্রা নির্ধারণ করুন। বোরন ও জিঙ্কের মাত্রা কৃষি কর্মকর্তার মাধ্যমে নিশ্চিত করুন।'],
    },
    calendarEvents: [2, 3, 9, 10].map(month => ({ month, type: 'planting' as const, title: 'পেঁপের চারা রোপণ', desc: 'পানি নিষ্কাশনযোগ্য জমিতে সুস্থ চারা রোপণ করুন।' })),
    bestSellingMonths: [3, 4, 5, 6], demandLevel: 'বেশি', exportPotential: false,
    goodCompanions: [], badCompanions: [], govtSupport: [],
    tips: ['কাঁচা পেঁপে সবজি এবং পাকা পেঁপে ফল হিসেবে বিক্রি করা যায়।', 'খরচ, ফলন ও বাজারদর প্রাথমিক পরিকল্পনার অনুমান—লাইভ বাজারদর বা নিশ্চিত লাভ নয়।', 'চাষের তথ্যসূত্র: BAMIS পেঁপে নির্দেশিকা; জাত, জমি ও এলাকার জন্য স্থানীয় কৃষি কর্মকর্তার পরামর্শ নিন।'],
  },
  // Watermelon: BARI/DAE cultivation guidance. Budget and yield are preliminary estimates.
  'watermelon': {
    id: 'watermelon', name: 'তরমুজ', nameEn: 'Watermelon', icon: '🍉',
    category: 'সবজি', seasons: ['রবি', 'খরিফ-১'],
    plantingMonths: [12, 1, 2], harvestMonths: [3, 4, 5],
    totalDays: 90, soilTypes: ['বেলে-দোআঁশ', 'দোআঁশ', 'বালি'],
    waterRequirement: 'মাঝারি', irrigationNeeded: true, phRange: { min: 6.0, max: 7.0 },
    seedCostPerBigha: 4000, fertilizerCost: 6000, pesticideCost: 4000, laborCost: 9000, otherCost: 3000,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 150, yieldMax: 250, avgMarketPrice: 500,
    get profitMin() { return this.yieldMin * this.avgMarketPrice - this.totalCost },
    get profitMax() { return this.yieldMax * this.avgMarketPrice - this.totalCost },
    get roi() { return Math.round((this.profitMin + this.profitMax) / 2 / this.totalCost * 100) },
    riskLevel: 'মাঝারি', riskFactors: ['ফিউজেরিয়াম উইল্ট', 'মাছি পোকা ও লাল মাকড়', 'আগাম বৃষ্টি ও শিলাবৃষ্টি'],
    varieties: [
      { name: 'গ্লোরি', type: 'হাইব্রিড', daysToHarvest: 85, yieldPerBigha: 220 },
      { name: 'ড্রাগন', type: 'হাইব্রিড', daysToHarvest: 80, yieldPerBigha: 200 },
      { name: 'সুগার বেবি', type: 'উফশী', daysToHarvest: 75, yieldPerBigha: 160 },
    ],
    stages: [
      { id: 'planting', name: 'বীজ বপন ও চারা', icon: '🌱', startDay: 0, endDay: 20, tasks: [
        { title: 'মাদা তৈরি', type: 'preparation', urgency: 'জরুরি', desc: 'বেলে-দোআঁশ উঁচু জমিতে ২×২ মিটার দূরত্বে মাদা তৈরি করে পচা গোবর, TSP, জিপসাম ও বোরন মিশিয়ে ৭–১০ দিন রাখুন।' },
        { title: 'বীজ বপন', type: 'task', urgency: 'জরুরি', desc: '১২–২৪ ঘণ্টা ভেজানো বীজ মাদায় ২–৩টি বপন করুন; পরে সবল ১–২টি চারা রাখুন।' },
      ] },
      { id: 'vine', name: 'লতা বৃদ্ধি', icon: '🌿', startDay: 20, endDay: 45, tasks: [
        { title: 'ইউরিয়া ও MOP উপরি প্রয়োগ', type: 'fertilizer', urgency: 'জরুরি', desc: 'চারা গজানোর ১৫–২০ দিন পর ও ৩৫–৪০ দিন পর মাদার চারপাশে কিস্তিতে দিন।' },
        { title: 'খড় বিছানো ও সেচ', type: 'irrigation', urgency: 'জরুরি', desc: 'লতার নিচে শুকনো খড় বিছান; মাটি শুকালে নালায় সেচ দিন, গোড়ায় পানি জমাবেন না।' },
        { title: 'লাল মাকড় ও জাব পোকা', type: 'pest', urgency: 'জরুরি', desc: 'পাতার নিচে পর্যবেক্ষণ করুন; মাকড় দেখা দিলে এবামেক্টিন (ভার্টিম্যাক) অনুমোদিত মাত্রায় স্প্রে করুন।' },
      ] },
      { id: 'flowering', name: 'ফুল ও ফল ধরা', icon: '🌸', startDay: 45, endDay: 65, tasks: [
        { title: 'হাতে পরাগায়ন', type: 'task', urgency: 'সাধারণ', desc: 'সকালে পুরুষ ফুল দিয়ে স্ত্রী ফুলে পরাগায়ন করলে ফল ধরা বাড়ে।' },
        { title: 'মাছি পোকা দমন', type: 'pest', urgency: 'জরুরি', desc: 'সেক্স ফেরোমন ফাঁদ বসান; আক্রান্ত ফল তুলে নষ্ট করুন।' },
        { title: 'ফিউজেরিয়াম উইল্ট পর্যবেক্ষণ', type: 'disease', urgency: 'জরুরি', desc: 'গাছ হঠাৎ ঢলে পড়লে আক্রান্ত গাছ তুলে ফেলুন ও গোড়ায় অনুমোদিত ছত্রাকনাশক দিন; একই জমিতে বারবার তরমুজ চাষ এড়ান।' },
      ] },
      { id: 'fruit-growth', name: 'ফল বড় হওয়া', icon: '🍉', startDay: 65, endDay: 80, tasks: [
        { title: 'ফল সীমিতকরণ', type: 'task', urgency: 'সাধারণ', desc: 'গাছপ্রতি ২–৩টি ভালো ফল রাখুন; ফলের নিচে খড় দিন যাতে পচন না ধরে।' },
        { title: 'সংগ্রহের আগে সেচ কমান', type: 'irrigation', urgency: 'সাধারণ', desc: 'সংগ্রহের ৭–১০ দিন আগে সেচ বন্ধ করলে মিষ্টতা বাড়ে।' },
      ] },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 80, endDay: 90, tasks: [
        { title: 'পাকা তরমুজ সংগ্রহ', type: 'harvest', urgency: 'জরুরি', desc: 'বোঁটার কাছের আকর্ষী শুকালে, মাটির দিকের অংশ হলুদ হলে ও টোকা দিলে ভারী শব্দ হলে সংগ্রহ করুন।' },
      ] },
    ],
    fertilizerGuide: {
      perBigha: { urea: 25, tsp: 20, mop: 20, gypsum: 12, zinc: 1.5, boron: 1.5 },
      soilAdjustment: { 'এঁটেল': {}, 'দোআঁশ': {}, 'বালি': {}, 'পলি': {}, 'বেলে-দোআঁশ': {} },
      schedule: [
        { timing: 'মাদা তৈরির সময়', items: ['পচা গোবর', 'সব TSP, জিপসাম, জিঙ্ক, বোরন', 'অর্ধেক MOP'], note: 'বপনের ৭–১০ দিন আগে মাদায় মেশান।' },
        { timing: 'বপনের ১৫–২০ ও ৩৫–৪০ দিন পর', items: ['ইউরিয়া কিস্তিতে', 'বাকি MOP'], note: 'গাছের গোড়া থেকে একটু দূরে প্রয়োগ করুন।' },
      ],
      warnings: ['প্রাথমিক হিসাব: official BARC/BARI land-based dose mapping সম্পূর্ণ নয়; মাটি পরীক্ষা অনুযায়ী মাত্রা ঠিক করুন।'],
    },
    calendarEvents: [12, 1, 2].map(month => ({ month, type: 'planting' as const, title: 'তরমুজ বীজ বপন', desc: 'বেলে-দোআঁশ উঁচু জমিতে মাদায় বীজ বপন করুন।' })),
    bestSellingMonths: [3, 4], demandLevel: 'বেশি', exportPotential: false,
    goodCompanions: [], badCompanions: ['শসা', 'মিষ্টি কুমড়া'], govtSupport: [],
    tips: ['রমজান ও চৈত্র-বৈশাখে চাহিদা ও দাম বেশি থাকে।', 'খরচ, ফলন ও বাজারদর প্রাথমিক অনুমান—স্থানীয় কৃষি কর্মকর্তার পরামর্শ নিন।'],
  },

  // ক্যাপসিকাম (মিষ্টি মরিচ) — BARI
  'capsicum': {
    id: 'capsicum', name: 'ক্যাপসিকাম', nameEn: 'Capsicum', icon: '🫑', category: 'সবজি',
    seasons: ['রবি'], plantingMonths: [10, 11], harvestMonths: [1, 2, 3], totalDays: 130,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ'], waterRequirement: 'মাঝারি', irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.0 },
    seedCostPerBigha: 6000, fertilizerCost: 5000, pesticideCost: 4000, laborCost: 9000, otherCost: 4000,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 60, yieldMax: 100, avgMarketPrice: 2400,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'মাঝারি', riskFactors: ['থ্রিপস ও মাকড়', 'ঢলে পড়া রোগ', 'বেশি গরমে ফুল ঝরা'],
    varieties: [
      { name: 'বারি মিষ্টি মরিচ-১', type: 'উফশী', daysToHarvest: 120, yieldPerBigha: 70 },
      { name: 'হাইব্রিড ক্যালিফোর্নিয়া ওয়ান্ডার', type: 'হাইব্রিড', daysToHarvest: 110, yieldPerBigha: 90 },
    ],
    stages: [
      { id: 'seedbed', name: 'বীজতলা', icon: '🌱', startDay: 0, endDay: 30,
        tasks: [{ title: 'বীজতলা/ট্রে-তে চারা', type: 'preparation', urgency: 'জরুরি', desc: 'নেট-ঢাকা বীজতলা বা প্লাগ ট্রে-তে চারা তৈরি করুন। বীজ ট্রাইকোডার্মা দিয়ে শোধন করুন।' }] },
      { id: 'transplanting', name: 'রোপণ', icon: '🚜', startDay: 30, endDay: 40,
        tasks: [
          { title: 'উঁচু বেডে রোপণ', type: 'task', urgency: 'জরুরি', desc: '৫০×৪০ সেমি দূরত্বে, মালচিং পেপার দিলে ভালো।' },
          { title: 'বেসাল সার', type: 'fertilizer', urgency: 'জরুরি', desc: 'পচা গোবর/কম্পোস্ট, TSP, অর্ধেক MOP, জিপসাম, বোরন।' },
        ] },
      { id: 'vegetative', name: 'বাড়ন্ত ও খুঁটি', icon: '🌿', startDay: 40, endDay: 80,
        tasks: [
          { title: 'খুঁটি/সাপোর্ট', type: 'task', urgency: 'সাধারণ', desc: 'ফলের ভারে গাছ হেলে না যায়, খুঁটি দিন।' },
          { title: 'ইউরিয়া কিস্তি', type: 'fertilizer', urgency: 'জরুরি', desc: 'রোপণের ২৫ ও ৫০ দিনে ইউরিয়া ও বাকি MOP।' },
          { title: 'থ্রিপস/মাকড় দমন', type: 'pest', urgency: 'জরুরি', desc: 'নীল/হলুদ আঠালো ফাঁদ; প্রয়োজনে Abamectin বা Spinosad।' },
        ] },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 80, endDay: 130,
        tasks: [{ title: 'ফল তোলা', type: 'harvest', urgency: 'জরুরি', desc: 'পূর্ণ আকারের চকচকে ফল বোঁটাসহ কেটে তুলুন।' }] },
    ],
    fertilizerGuide: {
      perBigha: { urea: 30, tsp: 25, mop: 20, gypsum: 15, zinc: 1.0, boron: 1.0 },
      soilAdjustment: { 'এঁটেল': {}, 'দোআঁশ': {}, 'বালি': { urea: 1.1 }, 'পলি': {}, 'বেলে-দোআঁশ': {} },
      schedule: [
        { timing: 'রোপণের আগে', items: ['পচা গোবর', 'TSP', 'MOP ১/২', 'জিপসাম', 'জিঙ্ক', 'বোরন'], note: '' },
        { timing: 'রোপণের ২৫ ও ৫০ দিন পর', items: ['Urea কিস্তিতে', 'MOP ১/২'], note: '' },
      ],
      warnings: ['প্রাথমিক হিসাব: মাটি পরীক্ষা অনুযায়ী মাত্রা ঠিক করুন।'],
    },
    calendarEvents: [
      { month: 10, type: 'planting', title: 'ক্যাপসিকাম চারা', desc: 'অক্টোবরে বীজতলা' },
      { month: 1, type: 'harvest', title: 'ক্যাপসিকাম সংগ্রহ', desc: 'জানুয়ারি-মার্চ' },
    ],
    bestSellingMonths: [1, 2], demandLevel: 'বেশি', exportPotential: true,
    goodCompanions: ['পেঁয়াজ', 'গাজর'], badCompanions: ['টমেটো', 'আলু'], govtSupport: [],
    tips: ['সুপারশপ ও হোটেলে চাহিদা বেশি — GAP পদ্ধতিতে উৎপাদন করলে ভালো দাম।'],
  },

  // ব্রকলি — BARI
  'broccoli': {
    id: 'broccoli', name: 'ব্রকলি', nameEn: 'Broccoli', icon: '🥦', category: 'সবজি',
    seasons: ['রবি'], plantingMonths: [9, 10, 11], harvestMonths: [12, 1, 2], totalDays: 90,
    soilTypes: ['দোআঁশ', 'বেলে-দোআঁশ', 'এঁটেল'], waterRequirement: 'মাঝারি', irrigationNeeded: true,
    phRange: { min: 6.0, max: 7.0 },
    seedCostPerBigha: 3500, fertilizerCost: 4000, pesticideCost: 2500, laborCost: 6500, otherCost: 2000,
    get totalCost() { return this.seedCostPerBigha + this.fertilizerCost + this.pesticideCost + this.laborCost + this.otherCost },
    yieldMin: 30, yieldMax: 50, avgMarketPrice: 2000,
    get profitMin() { return (this.yieldMin * this.avgMarketPrice) - this.totalCost },
    get profitMax() { return (this.yieldMax * this.avgMarketPrice) - this.totalCost },
    get roi() { return Math.round(((this.profitMin + this.profitMax) / 2 / this.totalCost) * 100) },
    riskLevel: 'মাঝারি', riskFactors: ['ডায়মন্ড ব্যাক মথ', 'দেরিতে তুললে ফুল ফুটে যায়'],
    varieties: [
      { name: 'বারি ব্রকলি-১', type: 'উফশী', daysToHarvest: 85, yieldPerBigha: 35 },
      { name: 'গ্রিন ম্যাজিক', type: 'হাইব্রিড', daysToHarvest: 75, yieldPerBigha: 45 },
    ],
    stages: [
      { id: 'seedbed', name: 'বীজতলা', icon: '🌱', startDay: 0, endDay: 25,
        tasks: [{ title: 'বীজতলা', type: 'preparation', urgency: 'জরুরি', desc: 'শোধিত বীজে নেট-ঢাকা বীজতলা তৈরি।' }] },
      { id: 'transplanting', name: 'রোপণ', icon: '🚜', startDay: 25, endDay: 35,
        tasks: [
          { title: 'রোপণ', type: 'task', urgency: 'জরুরি', desc: '৬০×৪৫ সেমি দূরত্বে রোপণ।' },
          { title: 'বেসাল সার', type: 'fertilizer', urgency: 'জরুরি', desc: 'পচা গোবর, TSP, MOP, জিপসাম, বোরন।' },
        ] },
      { id: 'heading', name: 'মাথা গঠন', icon: '🥦', startDay: 35, endDay: 75,
        tasks: [
          { title: 'ইউরিয়া কিস্তি', type: 'fertilizer', urgency: 'জরুরি', desc: 'রোপণের ২০ ও ৪০ দিনে ইউরিয়া।' },
          { title: 'পোকা দমন', type: 'pest', urgency: 'জরুরি', desc: 'ফেরোমোন ফাঁদ, প্রয়োজনে Spinosad বা Bt।' },
        ] },
      { id: 'harvest', name: 'সংগ্রহ', icon: '🧺', startDay: 75, endDay: 90,
        tasks: [{ title: 'মাথা কাটা', type: 'harvest', urgency: 'জরুরি', desc: 'কুঁড়ি ফোটার আগে শক্ত সবুজ মাথা ১০-১৫ সেমি ডাঁটাসহ কাটুন।' }] },
    ],
    fertilizerGuide: {
      perBigha: { urea: 25, tsp: 15, mop: 15, gypsum: 8, zinc: 1.0, boron: 1.0 },
      soilAdjustment: { 'এঁটেল': {}, 'দোআঁশ': {}, 'বালি': { urea: 1.1 }, 'পলি': {}, 'বেলে-দোআঁশ': {} },
      schedule: [
        { timing: 'রোপণের আগে', items: ['পচা গোবর', 'TSP', 'MOP ১/২', 'জিপসাম', 'বোরন'], note: '' },
        { timing: 'রোপণের ২০ ও ৪০ দিন পর', items: ['Urea কিস্তিতে', 'MOP ১/২'], note: '' },
      ],
      warnings: ['বোরনের অভাবে ডাঁটা ফাঁপা হয়।'],
    },
    calendarEvents: [
      { month: 10, type: 'planting', title: 'ব্রকলি রোপণ', desc: 'অক্টোবর-নভেম্বর' },
      { month: 1, type: 'harvest', title: 'ব্রকলি সংগ্রহ', desc: 'ডিসেম্বর-ফেব্রুয়ারি' },
    ],
    bestSellingMonths: [12, 1], demandLevel: 'বেশি', exportPotential: true,
    goodCompanions: ['পেঁয়াজ', 'লেটুস'], badCompanions: ['বাঁধাকপি', 'ফুলকপি'], govtSupport: [],
    tips: ['মাথা তোলার পর পাশের ছোট মাথাও বিক্রি করা যায়।'],
  },
}

// ══════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════

// Quick lookup by ID
export const getCrop = (id: string): CropData | null =>
  CROPS[id] || null

// Get all crops as array
export const getAllCrops = (): CropData[] =>
  Object.values(CROPS)

// Filter by category
export const getCropsByCategory = (cat: Category) =>
  getAllCrops().filter(c => c.category === cat)

// Filter by season
export const getCropsBySeason = (season: Season) =>
  getAllCrops().filter(c => c.seasons.includes(season))

// Filter by month (planting)
export const getCropsForMonth = (month: number) =>
  getAllCrops().filter(c => c.plantingMonths.includes(month))

// Filter by soil
export const getCropsBySoil = (soil: SoilType) =>
  getAllCrops().filter(c => c.soilTypes.includes(soil))

// Filter by water
export const getCropsByWater = (water: WaterNeed) =>
  getAllCrops().filter(c => c.waterRequirement === water)

// Get recommended crops (AI planning engine)
export const getRecommendedCrops = (params: {
  soilType: SoilType
  waterAvail: WaterNeed
  month: number
  goal: 'profit' | 'safe' | 'fast' | 'food'
  areaInShotok: number
}): CropData[] => {
  const { soilType, waterAvail, month, goal } = params

  let crops = getAllCrops().filter(c => {
    const soilOk = c.soilTypes.includes(soilType)
    const waterOk = waterAvail === 'বেশি' ||
      c.waterRequirement !== 'বেশি' ||
      (waterAvail === 'মাঝারি' && c.waterRequirement !== 'বেশি')
    const seasonOk = c.plantingMonths.some(m =>
      Math.abs(m - month) <= 1)
    return soilOk && waterOk && seasonOk
  })

  if (goal === 'profit') {
    crops.sort((a, b) => b.roi - a.roi)
  } else if (goal === 'safe') {
    crops.sort((a, b) => {
      const risk = { 'কম': 0, 'মাঝারি': 1, 'বেশি': 2 }
      return risk[a.riskLevel] - risk[b.riskLevel]
    })
  } else if (goal === 'fast') {
    crops.sort((a, b) => a.totalDays - b.totalDays)
  }

  return crops.slice(0, 5)
}

// Get current growing stage
export const getCurrentStage = (
  cropId: string,
  plantingDate: Date
): Stage | null => {
  const crop = getCrop(cropId)
  if (!crop) return null

  const daysSincePlanting = Math.floor(
    (Date.now() - plantingDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return crop.stages.find(s =>
    daysSincePlanting >= s.startDay &&
    daysSincePlanting <= s.endDay
  ) || null
}

// Get current month's calendar events
export const getMonthlyEvents = (month: number): {
  crop: CropData
  event: CalendarEvent
}[] => {
  const events: { crop: CropData; event: CalendarEvent }[] = []
  getAllCrops().forEach(crop => {
    crop.calendarEvents
      .filter(e => e.month === month)
      .forEach(event => events.push({ crop, event }))
  })
  return events
}