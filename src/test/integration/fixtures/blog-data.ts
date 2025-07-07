import { faker } from '@faker-js/faker';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    bio: string;
  };
  tags: string[];
  categories: string[];
  published_at: number;
  updated_at: number;
  reading_time: number; // in minutes
  view_count: number;
  like_count: number;
  comment_count: number;
  featured: boolean;
  status: 'draft' | 'published' | 'archived';
  featured_image: string;
  meta_description: string;
  related_posts: string[]; // IDs of related posts
}

const authors = [
  {
    id: 'author_1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    avatar: faker.image.avatar(),
    bio: 'Tech enthusiast and software developer with 10+ years of experience.'
  },
  {
    id: 'author_2',
    name: 'Michael Chen',
    email: 'michael.chen@example.com',
    avatar: faker.image.avatar(),
    bio: 'Full-stack developer passionate about web technologies and open source.'
  },
  {
    id: 'author_3',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@example.com',
    avatar: faker.image.avatar(),
    bio: 'Data scientist and AI researcher focused on machine learning applications.'
  },
  {
    id: 'author_4',
    name: 'David Kim',
    email: 'david.kim@example.com',
    avatar: faker.image.avatar(),
    bio: 'DevOps engineer specializing in cloud infrastructure and automation.'
  },
  {
    id: 'author_5',
    name: 'Lisa Thompson',
    email: 'lisa.thompson@example.com',
    avatar: faker.image.avatar(),
    bio: 'UX designer and frontend developer creating delightful user experiences.'
  },
  {
    id: 'author_6',
    name: 'James Wilson',
    email: 'james.wilson@example.com',
    avatar: faker.image.avatar(),
    bio: 'Mobile app developer with expertise in React Native and Flutter.'
  },
  {
    id: 'author_7',
    name: 'Maria Garcia',
    email: 'maria.garcia@example.com',
    avatar: faker.image.avatar(),
    bio: 'Security researcher and ethical hacker protecting digital assets.'
  },
  {
    id: 'author_8',
    name: 'Robert Brown',
    email: 'robert.brown@example.com',
    avatar: faker.image.avatar(),
    bio: 'Database architect with deep knowledge of SQL and NoSQL systems.'
  }
];

const techTags = [
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Go',
  'Rust', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'DevOps', 'CI/CD',
  'Machine Learning', 'AI', 'Data Science', 'Web Development', 'Mobile Development',
  'Cloud Computing', 'Microservices', 'Serverless', 'GraphQL', 'REST API',
  'Testing', 'Security', 'Performance', 'Scalability', 'Architecture', 'Design Patterns',
  'Open Source', 'Git', 'Agile', 'Database', 'MongoDB', 'PostgreSQL', 'Redis',
  'Elasticsearch', 'TypeSense', 'Search', 'Frontend', 'Backend', 'Full Stack'
];

const categories = [
  'Tutorial', 'Best Practices', 'Case Study', 'Opinion', 'News',
  'Guide', 'Review', 'Interview', 'Announcement', 'Deep Dive',
  'Quick Tip', 'Comparison', 'Getting Started', 'Advanced Topics'
];

function generateBlogPost(index: number): BlogPost {
  const author = faker.helpers.arrayElement(authors);
  const publishedDate = faker.date.past({ years: 2 });
  const updatedDate = faker.date.between({ from: publishedDate, to: new Date() });
  // Generate more realistic blog post lengths (1000-4000 words)
  const wordCount = faker.number.int({ min: 1000, max: 4000 });
  // Generate paragraphs to match the word count (avg ~100 words per paragraph)
  const paragraphCount = Math.ceil(wordCount / 100);
  const content = faker.lorem.paragraphs(paragraphCount, '\n\n');
  const readingTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words/minute
  
  const title = faker.helpers.arrayElement([
    `How to ${faker.hacker.verb()} ${faker.hacker.noun()} with ${faker.helpers.arrayElement(techTags)}`,
    `${faker.number.int({ min: 5, max: 15 })} Best Practices for ${faker.helpers.arrayElement(techTags)}`,
    `Understanding ${faker.helpers.arrayElement(techTags)} in ${new Date().getFullYear()}`,
    `Building ${faker.hacker.adjective()} Applications with ${faker.helpers.arrayElement(techTags)}`,
    `The Complete Guide to ${faker.helpers.arrayElement(techTags)}`,
    `Why ${faker.helpers.arrayElement(techTags)} is ${faker.hacker.adjective()} for Your Next Project`,
    `${faker.helpers.arrayElement(techTags)} vs ${faker.helpers.arrayElement(techTags)}: A Comprehensive Comparison`,
    `Getting Started with ${faker.helpers.arrayElement(techTags)}: A Beginner's Journey`
  ]);

  return {
    id: `post_${index + 1}`,
    title,
    slug: faker.helpers.slugify(title).toLowerCase(),
    content,
    excerpt: faker.lorem.paragraph(5),
    author,
    tags: faker.helpers.arrayElements(techTags, { min: 3, max: 8 }),
    categories: faker.helpers.arrayElements(categories, { min: 1, max: 3 }),
    published_at: publishedDate.getTime() / 1000,
    updated_at: updatedDate.getTime() / 1000,
    reading_time: readingTime,
    view_count: faker.number.int({ min: 100, max: 50000 }),
    like_count: faker.number.int({ min: 0, max: 500 }),
    comment_count: faker.number.int({ min: 0, max: 100 }),
    featured: faker.datatype.boolean(0.1), // 10% chance of being featured
    status: faker.helpers.weightedArrayElement([
      { value: 'published', weight: 85 },
      { value: 'draft', weight: 10 },
      { value: 'archived', weight: 5 }
    ]),
    featured_image: faker.image.url(),
    meta_description: faker.lorem.sentence(15),
    related_posts: [] // Will be populated after all posts are generated
  };
}

// Generate 75 blog posts
export const blogPosts: BlogPost[] = Array.from({ length: 75 }, (_, i) => generateBlogPost(i));

// Populate related posts
blogPosts.forEach((post, index) => {
  const numRelated = faker.number.int({ min: 2, max: 5 });
  const relatedIndices = faker.helpers.arrayElements(
    blogPosts
      .map((_, i) => i)
      .filter(i => i !== index),
    numRelated
  );
  post.related_posts = relatedIndices.map(i => blogPosts[i].id);
});

// Special test case blog posts
export const specialBlogPosts: BlogPost[] = [
  {
    id: 'post_special_1',
    title: 'Implementing Full-Text Search with TypeSense in React Applications',
    slug: 'implementing-full-text-search-with-typesense-in-react-applications',
    content: `Full-text search is a crucial feature for modern web applications. In this comprehensive guide, we'll explore how to implement powerful search capabilities using TypeSense with React.

## Introduction

TypeSense is a typo-tolerant, fast search engine that's perfect for building instant search experiences. When combined with React, it provides a seamless way to add search functionality to your applications.

## Why TypeSense?

1. **Typo Tolerance**: Handles spelling mistakes gracefully
2. **Fast Performance**: Sub-50ms search latencies
3. **Easy Integration**: Simple API and great documentation
4. **Faceted Search**: Built-in support for filters and facets
5. **Geo Search**: Location-based search capabilities

## Getting Started

First, install the TypeSense JavaScript client and React integration:

\`\`\`bash
npm install typesense typesense-instantsearch-adapter
\`\`\`

## Setting Up the Search Client

Create a TypeSense client instance with your server configuration...

[Content continues with detailed implementation steps, code examples, and best practices]`,
    excerpt: 'Learn how to implement powerful full-text search capabilities in your React applications using TypeSense, a modern, typo-tolerant search engine.',
    author: authors[0],
    tags: ['TypeSense', 'React', 'Search', 'Full Stack', 'JavaScript', 'Tutorial'],
    categories: ['Tutorial', 'Guide', 'Best Practices'],
    published_at: Date.now() / 1000 - 86400 * 7,
    updated_at: Date.now() / 1000 - 86400,
    reading_time: 15,
    view_count: 12543,
    like_count: 342,
    comment_count: 87,
    featured: true,
    status: 'published',
    featured_image: 'https://example.com/typesense-react.jpg',
    meta_description: 'Complete guide to implementing TypeSense full-text search in React applications with code examples and best practices.',
    related_posts: ['post_2', 'post_5', 'post_12']
  },
  {
    id: 'post_special_2',
    title: 'The State of JavaScript Frameworks in 2024: A Comprehensive Analysis',
    slug: 'state-of-javascript-frameworks-2024-comprehensive-analysis',
    content: `The JavaScript ecosystem continues to evolve rapidly. Let's dive deep into the current state of JavaScript frameworks in 2024.

## Executive Summary

This year has seen significant developments in the JavaScript framework landscape, with established players evolving and new contenders emerging.

## Major Frameworks Overview

### React
Still the dominant player with over 40% market share...

### Vue.js
Continues to grow with Vue 3 adoption accelerating...

### Angular
Major improvements in performance and developer experience...

### Svelte
Rising star with compile-time optimizations...

[Detailed analysis continues with statistics, benchmarks, and real-world usage data]`,
    excerpt: 'An in-depth analysis of JavaScript frameworks in 2024, comparing React, Vue, Angular, and emerging technologies.',
    author: authors[1],
    tags: ['JavaScript', 'React', 'Vue', 'Angular', 'Svelte', 'Frontend', 'Web Development'],
    categories: ['Deep Dive', 'Comparison', 'Analysis'],
    published_at: Date.now() / 1000 - 86400 * 30,
    updated_at: Date.now() / 1000 - 86400 * 15,
    reading_time: 25,
    view_count: 34567,
    like_count: 892,
    comment_count: 234,
    featured: true,
    status: 'published',
    featured_image: 'https://example.com/js-frameworks-2024.jpg',
    meta_description: 'Comprehensive analysis of JavaScript frameworks in 2024, including market share, performance benchmarks, and future trends.',
    related_posts: ['post_3', 'post_8', 'post_15', 'post_22']
  },
  {
    id: 'post_special_3',
    title: 'Building a Real-Time Chat Application with WebSockets and Node.js',
    slug: 'building-real-time-chat-application-websockets-nodejs',
    content: `Real-time communication is essential for modern applications. This tutorial will guide you through building a complete chat application.

## Prerequisites

- Node.js installed
- Basic knowledge of JavaScript
- Understanding of client-server architecture

## Architecture Overview

Our chat application will consist of:
1. Node.js server with Socket.io
2. React frontend
3. MongoDB for message persistence
4. Redis for session management

[Detailed implementation with code examples follows]`,
    excerpt: 'Step-by-step guide to building a scalable real-time chat application using WebSockets, Node.js, and React.',
    author: authors[2],
    tags: ['Node.js', 'WebSockets', 'Real-time', 'React', 'MongoDB', 'Tutorial'],
    categories: ['Tutorial', 'Guide', 'Project'],
    published_at: Date.now() / 1000 - 86400 * 14,
    updated_at: Date.now() / 1000 - 86400 * 2,
    reading_time: 20,
    view_count: 8234,
    like_count: 245,
    comment_count: 56,
    featured: false,
    status: 'published',
    featured_image: 'https://example.com/chat-app-tutorial.jpg',
    meta_description: 'Learn to build a real-time chat application from scratch using WebSockets, Node.js, and modern web technologies.',
    related_posts: ['post_7', 'post_11', 'post_18']
  },
  {
    id: 'post_draft_1',
    title: 'Microservices Architecture: Lessons Learned from Production',
    slug: 'microservices-architecture-lessons-learned-production',
    content: `Draft content about microservices architecture patterns and real-world experiences...`,
    excerpt: 'Practical insights and lessons learned from implementing microservices architecture in production environments.',
    author: authors[3],
    tags: ['Microservices', 'Architecture', 'DevOps', 'Docker', 'Kubernetes'],
    categories: ['Case Study', 'Best Practices'],
    published_at: 0,
    updated_at: Date.now() / 1000,
    reading_time: 18,
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    featured: false,
    status: 'draft',
    featured_image: 'https://example.com/microservices-draft.jpg',
    meta_description: 'Real-world lessons from implementing microservices architecture in production.',
    related_posts: []
  },
  {
    id: 'post_archived_1',
    title: 'Introduction to React Hooks (Archived)',
    slug: 'introduction-react-hooks-archived',
    content: `This is an archived post about React Hooks when they were first introduced...`,
    excerpt: 'An introduction to React Hooks from when they were first released.',
    author: authors[4],
    tags: ['React', 'Hooks', 'JavaScript', 'Frontend'],
    categories: ['Tutorial', 'Getting Started'],
    published_at: Date.now() / 1000 - 86400 * 730, // 2 years ago
    updated_at: Date.now() / 1000 - 86400 * 365, // 1 year ago
    reading_time: 10,
    view_count: 45678,
    like_count: 1234,
    comment_count: 345,
    featured: false,
    status: 'archived',
    featured_image: 'https://example.com/react-hooks-old.jpg',
    meta_description: 'Archived tutorial on React Hooks from their initial release.',
    related_posts: ['post_1', 'post_4']
  }
];

// Combine all blog posts
export const allBlogPosts = [...blogPosts, ...specialBlogPosts];

// Helper functions for filtering
export function getPostsByAuthor(authorId: string): BlogPost[] {
  return allBlogPosts.filter(post => post.author.id === authorId);
}

export function getPostsByTag(tag: string): BlogPost[] {
  return allBlogPosts.filter(post => post.tags.includes(tag));
}

export function getPostsByCategory(category: string): BlogPost[] {
  return allBlogPosts.filter(post => post.categories.includes(category));
}

export function getPublishedPosts(): BlogPost[] {
  return allBlogPosts.filter(post => post.status === 'published');
}

export function getFeaturedPosts(): BlogPost[] {
  return allBlogPosts.filter(post => post.featured && post.status === 'published');
}

export function getPostsInDateRange(startDate: Date, endDate: Date): BlogPost[] {
  const start = startDate.getTime() / 1000;
  const end = endDate.getTime() / 1000;
  return allBlogPosts.filter(post => 
    post.published_at >= start && post.published_at <= end && post.status === 'published'
  );
}

// Export blog data statistics
export const blogDataStats = {
  totalPosts: allBlogPosts.length,
  publishedPosts: allBlogPosts.filter(p => p.status === 'published').length,
  draftPosts: allBlogPosts.filter(p => p.status === 'draft').length,
  archivedPosts: allBlogPosts.filter(p => p.status === 'archived').length,
  featuredPosts: allBlogPosts.filter(p => p.featured).length,
  uniqueAuthors: [...new Set(allBlogPosts.map(p => p.author.id))].length,
  uniqueTags: [...new Set(allBlogPosts.flatMap(p => p.tags))].length,
  categories: [...new Set(allBlogPosts.flatMap(p => p.categories))],
  averageReadingTime: Math.round(allBlogPosts.reduce((sum, p) => sum + p.reading_time, 0) / allBlogPosts.length),
  totalComments: allBlogPosts.reduce((sum, p) => sum + p.comment_count, 0),
  totalViews: allBlogPosts.reduce((sum, p) => sum + p.view_count, 0)
};