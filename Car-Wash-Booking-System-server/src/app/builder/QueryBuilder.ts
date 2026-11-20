import { FilterQuery, Query } from 'mongoose';

class QueryBuilder<T> {
  public modelQuery: Query<T[], T>;
  public query: Record<string, unknown>;

  constructor(modelQuery: Query<T[], T>, query: Record<string, unknown>) {
    this.modelQuery = modelQuery;
    this.query = query;
  }

  search(searchableFields: string[]) {
    const searchTerm = this?.query?.searchTerm;
    if (
      typeof searchTerm === 'string' &&
      searchTerm.length > 0 &&
      searchTerm.length <= 100
    ) {
      const literalSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      this.modelQuery = this.modelQuery.find({
        $or: searchableFields.map(
          (field) =>
            ({
              [field]: { $regex: literalSearchTerm, $options: 'i' },
            }) as FilterQuery<T>,
        ),
      });
    }

    return this;
  }

  filter() {
    const excludeFields = ['searchTerm', 'sort', 'limit', 'page', 'fields'];
    const queryObj = Object.fromEntries(
      Object.entries(this.query).filter(
        ([key, value]) =>
          !excludeFields.includes(key) &&
          /^[a-zA-Z][a-zA-Z0-9_]*$/.test(key) &&
          (typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean') &&
          String(value).length <= 200,
      ),
    );

    this.modelQuery = this.modelQuery.find(queryObj as FilterQuery<T>);

    return this;
  }

  sort() {
    const sortFields =
      typeof this.query.sort === 'string'
        ? this.query.sort
            .split(',')
            .filter((field) => /^-?[a-zA-Z][a-zA-Z0-9_]*$/.test(field))
            .slice(0, 5)
        : [];
    const sort = sortFields.join(' ') || '-createdAt';
    this.modelQuery = this.modelQuery.sort(sort as string);

    return this;
  }

  paginate() {
    const requestedPage = Number(this.query.page);
    const requestedLimit = Number(this.query.limit);
    const page =
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;
    const limit =
      Number.isSafeInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 6;
    const skip = (page - 1) * limit;

    this.modelQuery = this.modelQuery.skip(skip).limit(limit);

    return this;
  }

  fields() {
    const selectedFields =
      typeof this.query.fields === 'string'
        ? this.query.fields
            .split(',')
            .filter(
              (field) =>
                /^[a-zA-Z][a-zA-Z0-9_]*$/.test(field) &&
                field !== 'password',
            )
        : [];
    const fields = selectedFields.join(' ') || '-__v';

    this.modelQuery = this.modelQuery.select(fields);
    return this;
  }

  async countTotal() {
    const totalQueries = this.modelQuery.getFilter();
    const total = await this.modelQuery.model.countDocuments(totalQueries);
    const page = Number(this?.query?.page) || 1;
    const limit = Number(this?.query?.limit) || 6;
    const totalPage = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPage,
    };
  }
}
export default QueryBuilder;
