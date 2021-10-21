const { isPlainObject, isArray } = require('lodash')

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
              if (value.ne) {
                _where[key] = { [this.Op.ne]: value.ne };
              }
            }else if(value.hasOwnProperty('or')){
              if (value.or) {
                _where[key] = { [this.Op.or]: value.or };
              }
            }else if(value.hasOwnProperty('gt')){
              if (value.gt) {
                _where[key] = { [this.Op.gt]: value.gt };
              }
            }else if(value.hasOwnProperty('gte')){
              if (value.gte) {
                _where[key] = { [this.Op.gte]: value.gte };
              }
            }else if(value.hasOwnProperty('lt')){
              if (value.lt) {
                _where[key] = { [this.Op.lt]: value.lt };
              }
            }else if(value.hasOwnProperty('lte')){
              if (value.lte) {
                _where[key] = { [this.Op.lte]: value.lte };
              }
            }else if(value.hasOwnProperty('lte')){
              if (value.lte) {
                _where[key] = { [this.Op.lte]: value.lte };
              }
            }else if(value.hasOwnProperty('between')){
              if (value.between) {
                _where[key] = { [this.Op.between]: value.between };
              }
            }else if(value.hasOwnProperty('notBetween')){
              if (value.notBetween) {
                _where[key] = { [this.Op.notBetween]: value.notBetween };
              }
            }
            else {
              _where[key] = value;
            }
          } else {
            _where[key] = value;
          }
      }
    }
    return _where
  }
  
  parseOrder(orders, associations){
    if(!orders){ return orders }
    const _orderModels = []    
    for (const item of orders) {
      const [first, ...rest] = item
      if(isArray(first)){
        const parsedItem = []
        let _associations = associations;
        for (const _item of first) {
          const model = _associations[_item];
          if(model){
            _associations = model.target.associations
            parsedItem.push(model)
          }
        }
        _orderModels.push(parsedItem.concat(rest))
      }else{
        _orderModels.push(item)
      }
    }
    return _orderModels
  }
  
  parseInclude(include, associations){
    if(!include){ return }
    const self = this
    const _include = []
    for (const inc of include) {
      const model = associations[inc.model]?.target
      if(model){
        inc.model = model
        if(inc.where){
          inc.where = self.parseWhere(inc.where)
        }
        if(inc.include){
          inc.include = self.parseInclude(inc.include, model.associations)
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
      const { limit, offset } = filter
      if(filter?.order){
        filter.order = self.parseOrder(filter?.order, self.associations)
      }
      if(filter?.where){
        filter.where = self.parseWhere(filter?.where)
      }
      if(filter?.include){
        filter.include = self.parseInclude(filter?.include, self.associations)
      }
      
      const total = await self.klass.count({ ...filter ,distinct: true })
      
      const results = await self.klass.findAll({
        ...filter,
        subQuery: limit ? true : false,
        limit,
        offset
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

  findByIdWithInclude(){
    const self = this;
    return async (id, filter={}, scope=null)=>{
      if(typeof filter == "string"){
        filter = JSON.parse(filter||"{}")
      }
      filter.include = self.parseInclude(filter?.include, self.associations)
      if(scope){
        return await this.klass.scope(scope).findByPk(id, filter)
      }
      return await this.klass.findByPk(id, filter)
    }
  }


  static addCustomInclude(Op, klass){
    const self = new this(Op, klass)
    self.klass.findWithInclude = self.findWithInclude()
    self.klass.findByIdWithInclude = self.findByIdWithInclude()
    return self
  }
  
}

module.exports = Include