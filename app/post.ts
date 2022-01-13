import parseFrontMatter from 'front-matter';
import invariant from 'tiny-invariant';
import { marked } from 'marked';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export type Post = {
  slug: string;
  title: string;
  emphasis?: string;
  icon?: string;
};

export type PostMarkdownAttributes = {
  title: string;
  icon?: string;
  emphasis?: string;
};

function isValidPostAttributes(
  attributes: any
): attributes is PostMarkdownAttributes {
  return attributes?.title;
}

async function getPostContent(path: string): Promise<{
  attributes: PostMarkdownAttributes;
  body: string;
}> {
  const fileResponse = await octokit.rest.repos.getContent({
    owner: 'jdeniau',
    repo: 'julien.deniau.me',
    path: path,
    ref: 'main',
    headers: {
      accept: 'application/vnd.github.v3.raw',
    },
  });

  invariant(
    typeof fileResponse.data === 'string',
    'fileResponse.data is not a string'
  );

  const { attributes, body } = parseFrontMatter(fileResponse.data);
  invariant(
    isValidPostAttributes(attributes),
    `Post ${path} is missing attributes`
  );

  return { attributes, body };
}

export async function getPosts() {
  const dirResponse = await octokit.rest.repos.getContent({
    owner: 'jdeniau',
    repo: 'julien.deniau.me',
    path: 'posts',
    ref: 'main',
  });

  invariant(
    Array.isArray(dirResponse.data),
    'dirResponse.data is not an array'
  );

  return Promise.all(
    dirResponse.data.map(async (file) => {
      const { attributes, body } = await getPostContent(file.path);

      return {
        slug: file.name.replace(/\.md$/, ''),
        title: attributes.title,
        icon: attributes.icon,
        emphasis: attributes.emphasis,
      };
    })
  );
}

export async function getPost(slug: string) {
  const { attributes, body } = await getPostContent(`/posts/${slug}.md`);

  const html = marked(body);

  return {
    slug,
    html,
    title: attributes.title,
    icon: attributes.icon,
    emphasis: attributes.emphasis,
  };
}
