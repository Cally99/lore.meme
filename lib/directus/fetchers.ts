import { PageBlock, Post } from '@/types/directus-schema';
import { useDirectus } from './directus';
import { readItems, aggregate, readItem, readSingleton, withToken } from '@directus/sdk';

// Define missing BlockPost type
interface BlockPost {
  id: string;
  collection?: string;
  limit?: number;
  posts?: Post[];
}

// Define a generic QueryFilter type to avoid SDK version issues
type QueryFilter<T = any> = {
  [K in keyof T]?: {
    _eq?: T[K];
    _neq?: T[K];
    _in?: T[K][];
    _nin?: T[K][];
    _gt?: T[K];
    _gte?: T[K];
    _lt?: T[K];
    _lte?: T[K];
    _null?: boolean;
    _nnull?: boolean;
    _contains?: string;
    _ncontains?: string;
    _starts_with?: string;
    _nstarts_with?: string;
    _ends_with?: string;
    _nends_with?: string;
  };
};

/**
 * Fetches page data by permalink, including all nested blocks and dynamically fetching blog posts if required.
 */
export const fetchPageData = async (permalink: string, postPage = 1) => {
	const { directus, readItems } = useDirectus();

	try {
		const pageData = await directus.request(
			readItems('pages', {
				filter: { permalink: { _eq: permalink } },
				limit: 1,
				fields: [
					'title',
					'seo',
					'id',
					{
						blocks: [
							'id',
							'background',
							'collection',
							'item',
							'sort',
							'hide_block',
							{
								item: {
									block_richtext: ['id', 'tagline', 'headline', 'content', 'alignment'],
									block_gallery: ['id', 'tagline', 'headline', { items: ['id', 'directus_file', 'sort'] as any }],
									block_pricing: [
										'id',
										'tagline',
										'headline',
										{
											pricing_cards: [
												'id',
												'title',
												'description',
												'price',
												'badge',
												'features',
												'is_highlighted',
												{
													button: [
														'id',
														'label',
														'variant',
														'url',
														'type',
														{ page: ['permalink'] },
														{ post: ['slug'] },
													],
												},
											],
										},
									],
									block_hero: [
										'id',
										'tagline',
										'headline',
										'description',
										'layout',
										'image',
										{
											button_group: [
												'id',
												{
													buttons: [
														'id',
														'label',
														'variant',
														'url',
														'type',
														{ page: ['permalink'] },
														{ post: ['slug'] },
													],
												},
											],
										},
									],
									block_posts: ['id', 'tagline', 'headline', 'collection', 'limit'],
									block_form: [
										'id',
										'tagline',
										'headline',
										{
											form: [
												'id',
												'title',
												'submit_label',
												'success_message',
												'on_success',
												'success_redirect_url',
												'is_active',
												{
													fields: [
														'id',
														'name',
														'type',
														'label',
														'placeholder',
														'help',
														'validation',
														'width',
														'choices',
														'required',
														'sort',
													],
												},
											],
										},
									],
								},
							},
						],
					},
				],
				deep: {
					blocks: { _sort: ['sort'], _filter: { hide_block: { _neq: true } } },
				},
			}),
		);

		if (!pageData.length) {
			throw new Error('Page not found');
		}

		const page = pageData[0];

		if (Array.isArray(page.blocks)) {
			for (const block of page.blocks as PageBlock[]) {
				if (
					block.collection === 'block_posts' &&
					typeof block.item === 'object' &&
					(block.item as BlockPost).collection === 'posts'
				) {
					const limit = (block.item as BlockPost).limit ?? 6;
					const posts = await directus.request<Post[]>(
						readItems('posts', {
							fields: ['id', 'title', 'description', 'slug', 'image', 'status', 'published_at'],
							filter: { status: { _eq: 'published' } },
							sort: ['-published_at'],
							limit,
							page: postPage,
						}),
					);

					(block.item as BlockPost & { posts: Post[] }).posts = posts;
				}
			}
		}

		return page;
	} catch (error) {
		console.error('Error fetching page data:', error);
		throw new Error('Failed to fetch page data');
	}
};

/**
 * Fetches global site data, header navigation, and footer navigation.
 */
export const fetchSiteData = async () => {
	const { directus } = useDirectus();

	try {
	   const processDirectusRequest = async (requestPromise: Promise<any>, itemName: string) => {
	     try {
	       // Directus SDK v11+ returns the data directly, not a Response object.
	       // The error handling for non-JSON responses or network errors is typically handled by the SDK.
	       // If an error occurs (network, server error, non-JSON), the SDK should throw.
	       const data = await requestPromise;
	       if (data === undefined || data === null) {
	         // This case might indicate an issue if Directus returns null/undefined successfully,
	         // which is unusual for readSingleton/readItem if the item exists.
	         console.warn(`Directus request for ${itemName} returned null or undefined.`);
	         // Depending on how critical this item is, you might throw or return a default.
	         // For globals/navigation, it's likely critical.
	         throw new Error(`Directus request for ${itemName} returned null or undefined.`);
	       }

	       return data;
	     } catch (e: any) {
	       // Log the specific error from the SDK
	       console.error(`Error fetching ${itemName} from Directus:`, e);
	       // Attempt to get more details if it's a FetchError from the SDK
	       if (e.response && typeof e.response.text === 'function') {
	         const errorText = await e.response.text().catch(() => 'Could not read error response text.');
	         console.error(`Raw error response for ${itemName}:`, errorText);
	         throw new Error(`Failed to fetch ${itemName}. Server responded with: ${e.message}. Raw: ${errorText.substring(0, 200)}`);
	       }
	       throw new Error(`Failed to fetch ${itemName}. Error: ${e.message}`);
	     }
	   };

		const [globals, headerNavigation, footerNavigation] = await Promise.all([
			processDirectusRequest(directus.request(
				readSingleton('globals', {
					fields: ['id', 'title', 'description', 'logo', 'logo_dark_mode', 'social_links', 'accent_color', 'favicon'],
				}),
			), 'globals'),
			processDirectusRequest(directus.request(
				readItem('navigation', 'main', {
					fields: [
						'id',
						'title',
						{
							items: [
								'id',
								'title',
								{
									page: ['permalink'],
									children: ['id', 'title', 'url', { page: ['permalink'] }],
								},
							],
						},
					],
					deep: { items: { _sort: ['sort'] } },
				}),
			), 'headerNavigation'),
			processDirectusRequest(directus.request(
				readItem('navigation', 'footer', {
					fields: [
						'id',
						'title',
						{
							items: [
								'id',
								'title',
								{
									page: ['permalink'],
									children: ['id', 'title', 'url', { page: ['permalink'] }],
								},
							],
						},
					],
				}),
			), 'footerNavigation'),
		]);

		return { globals, headerNavigation, footerNavigation };
	} catch (error) {
		// This top-level catch will now catch errors re-thrown by processDirectusRequest
		console.error('Overall error in fetchSiteData:', error);
		// Ensure a generic error is thrown to the caller (e.g., RootLayout)
		// The specific error details are already logged by processDirectusRequest.
		throw new Error('Failed to fetch essential site data. Please check server logs.');
	}
};

/**
 * Fetches a single blog post by slug and related blog posts excluding the given ID. Handles live preview mode.
 */

export const fetchPostBySlug = async (
	slug: string,
	options?: { draft?: boolean; token?: string },
): Promise<{ post: Post | null; relatedPosts: Post[] }> => {
	const { directus } = useDirectus();
	const { draft, token } = options || {};

	try {
		const filter: QueryFilter = options?.draft
			? { slug: { _eq: slug } }
			: { slug: { _eq: slug }, status: { _eq: 'published' } };
		// @ts-ignore: TypeScript error in Directus SDK
		let postRequest = readItems('posts', {
			filter,
			limit: 1,
			fields: [
				'id',
				'title',
				'content',
				'status',
				'published_at',
				'image',
				'description',
				'slug',
				'seo',
				{
					author: ['id', 'first_name', 'last_name', 'avatar'],
				},
			],
		});

		// This is a really naive implementation of related posts. Just a basic check to ensure we don't return the same post. You might want to do something more sophisticated.
		let relatedRequest = readItems<any, 'posts', any>('posts', { // Changed Schema to any
			filter: { slug: { _neq: slug }, status: { _eq: 'published' } },
			limit: 2,
			fields: ['id', 'title', 'slug', 'image'],
		});

		if (draft && token) {
			postRequest = withToken(token, postRequest);
			relatedRequest = withToken(token, relatedRequest);
		}

		const [posts, relatedPosts] = await Promise.all([
			directus.request<Post[]>(postRequest),
			directus.request<Post[]>(relatedRequest),
		]);

		const post: Post | null = posts.length > 0 ? (posts[0] as Post) : null;

		return { post, relatedPosts };
	} catch (error) {
		console.error('Error in fetchPostBySlug:', error);
		throw new Error('Failed to fetch blog post and related posts');
	}
};

/**
 * Fetches paginated blog posts.
 */
export const fetchPaginatedPosts = async (limit: number, page: number) => {
	const { directus } = useDirectus();
	try {
		const response = await directus.request(
			readItems('posts', {
				limit,
				page,
				sort: ['-published_at'],
				fields: ['id', 'title', 'description', 'slug', 'image'],
				filter: { status: { _eq: 'published' } },
			}),
		);

		return response;
	} catch (error) {
		console.error('Error fetching paginated posts:', error);
		throw new Error('Failed to fetch paginated posts');
	}
};

/**
 * Fetches the total number of published blog posts.
 */
export const fetchTotalPostCount = async (): Promise<number> => {
	const { directus } = useDirectus();

	try {
		const response = await directus.request(
			aggregate('posts', {
				aggregate: { count: '*' },
				filter: { status: { _eq: 'published' } },
			}),
		);

		return Number(response[0]?.count) || 0;
	} catch (error) {
		console.error('Error fetching total post count:', error);

		return 0;
	}
};
