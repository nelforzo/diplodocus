import Dexie from 'dexie';

const db = new Dexie('EReaderDB');

db.version(1).stores({
  books: '++id, title, author, filename, fileSize, addedAt',
});

db.version(2).stores({
  books:    '++id, title, author, filename, fileSize, addedAt',
  // bookId + spineIndex indexed for ordered chapter queries per book
  chapters: '++id, bookId, spineIndex',
});

// Non-indexed fields (stored but not queryable):
//   books:    coverBlob, chapterCount
//   chapters: title, href

export default db;
