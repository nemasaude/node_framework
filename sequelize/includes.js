const { isPlainObject } = require('lodash')
class Include{
  constructor(Op, klass){
    this.Op = Op
    this.klass = klass
    this.associations = this.klass.associations;
  }
  parseWhere(where){
    const _where = {}
    const self = this
    if(!where){ return }
    for (const key in where) {
      const value = where[key];
      switch (key) {
        case 'or':
          _where[this.Op.or] = value.map(p=>self.parseWhere(p))
          break
        case 'and':
          _where[this.Op.and] = value.map(p=>self.parseWhere(p))
          break
        default:
          if (isPlainObject(value)) {
            if (value.hasOwnProperty('like')) {
              if (value.like) {
                _where[key] = { [this.Op.like]: value.like };
              }
            }else if(value.hasOwnProperty('in')){
              if (value.in) {
                _where[key] = { [this.Op.in]: value.in };
              }
            }else if(value.hasOwnProperty('ne')){
              if (value.in) {
                _where[key] = { [this.Op.ne]: value.ne };
              }
            }else if(value.hasOwnProperty('or')){
              if (value.in) {
                _where[key] = { [this.Op.or]: value.or };
              }
            }else {
              _where[key] = value;
            }
          } else {
            _where[key] = value;
          }
      }
    }
    return _where
  }
  parseInclude(include){
    if(!include){ return }
    const self = this
    const _include = []
    for (const inc of include) {
      const model = self.associations[inc.model]?.target
      if(model){
        inc.model = model
        if(inc.where){
          inc.where = self.parseWhere(inc.where)
        }
        if(inc.include){
          inc.include = self.parseInclude(include.include)
        }
        _include.push(inc)
      }
    }
    return _include
  }
  findWithInclude(){
    const self = this;
    return async (filter) =>{
      if(typeof filter == "string"){
        filter = JSON.parse(filter||"{}")
      }
      const { limit, offset, order=[['id', 'DESC']] } = filter
  
      filter.where = self.parseWhere(filter?.where)
      
      filter.include = self.parseInclude(filter?.include)
      const total = await self.klass.count({...filter,distinct: true})
      
      const results = await self.klass.findAll({
        ...filter,
        subQuery: false,
        limit,
        offset,
        order
      })
  
      return {
        docs: results,
        meta: {
          totalCount: total,
          totalPages: Math.ceil( total/limit )
        }
      }

    }
  }

  static addCustomInclude(Op, klass){
    const self = new this(Op, klass)
    self.klass.findWithInclude = self.findWithInclude()
    return self
  }
}

module.exports = Include