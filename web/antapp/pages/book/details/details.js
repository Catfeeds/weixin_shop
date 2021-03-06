if (typeof wx === 'undefined') var wx = getApp().hj;
 // pages/book/details/details.js
var api = require('../../../api.js');
var utils = require('../../../utils.js');
var app = getApp();
var WxParse = require('../../../wxParse/wxParse.js');
var p = 1;
var is_loading_comment = false;
var is_more_comment = true;
Page({

    /**
     * 页面的初始数据
     */
    data: {
        tab_detail: "active",
        tab_comment: "",
        comment_list: [],
        comment_count: {
            score_all: 0,
            score_3: 0,
            score_2: 0,
            score_1: 0,
        },
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        app.pageOnLoad(this, options);

        var parent_id = 0;
        var user_id = options.user_id;
        var scene = decodeURIComponent(options.scene);
        if (typeof user_id !== 'undefined') {
            parent_id = user_id;
        } else if (typeof scene !== 'undefined') {
            var scene_obj = utils.scene_decode(scene);
            if (scene_obj.uid && scene_obj.gid) {
                parent_id = scene_obj.uid;
                options.id = scene_obj.gid;
            } else {
                parent_id = scene;
            }
        } else {
            if (app.query !== null) {
                var query = app.query;
                app.query = null;
                options.id = query.gid;
                parent_id = query.uid;
            }
        }
        app.loginBindParent({ parent_id: parent_id });

        this.setData({
            id: options.id,
        });
        p = 1;
        this.getGoodsInfo(options);
        this.getCommentList(false);
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {
    
    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {
        app.pageOnShow(this);
        
    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {
    
    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {
    
    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {
    
    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {
        var page = this;
        page.getCommentList(true);
    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage: function () {
        var page = this;
        var user_info = wx.getStorageSync("user_info");
        return {
            title: page.data.goods.name,
            path: '/pages/book/details/details?id=' + page.data.goods.id + '&user_id='+ user_info.id,
            imageUrl: page.data.goods.cover_pic,
            success: function (res) {
                // 转发成功
            }
        }
    },
    /**
     * 获取商品详情
     */
    getGoodsInfo: function (e) {
        var gid = e.id;
        var page = this;
        wx.showLoading({
            title: "正在加载",
            mask: true,
        });
        // wx.showNavigationBarLoading();
        app.request({
            url: api.book.details,
            method: "get",
            data: { gid: gid },
            success: function (res) {
                if (res.code == 0) {
                    var detail = res.data.info.detail;
                    WxParse.wxParse("detail", "html", detail, page);
                    // wx.setNavigationBarTitle({
                    //     title: res.data.info.name,
                    // })
                    // wx.hideNavigationBarLoading();
                    var sales = (parseInt(res.data.info.virtual_sales) + parseInt(res.data.info.sales));

                    //todo 兼容
                    if(res.data.attr_group_list.length<=0){
                        res.data.attr_group_list = [{
                            attr_group_name :'规格',
                            attr_list : [{
                                attr_id : 0,
                                attr_name : '默认',
                                checked : true,
                            }]
                        }];
                    };
                    page.setData({
                        goods: res.data.info,
                        shop:res.data.shopList,
                        sales: sales,
                        attr_group_list: res.data.attr_group_list
                    });
                    
                    page.selectDefaultAttr();
                } else {
                    wx.showModal({
                        title: '提示',
                        content: res.msg,
                        showCancel: false,
                        success: function (res) {
                            if (res.confirm) {
                                wx.redirectTo({
                                    url: '/pages/book/index/index'
                                });
                            }
                        }
                    });
                }
            },
            complete: function (res) {
                setTimeout(function () {
                    // 延长一秒取消加载动画
                    wx.hideLoading();
                }, 1000);
            }
        });
    },
    selectDefaultAttr: function() {
        var page = this;
        if (!page.data.goods || page.data.goods.use_attr != 0)
            return;
        for (var i in page.data.attr_group_list) {
            for (var j in page.data.attr_group_list[i].attr_list) {
                if (i == 0 && j == 0)
                    page.data.attr_group_list[i].attr_list[j]['checked'] = true;
            }
        }
        page.setData({
            attr_group_list: page.data.attr_group_list,
        });
    },
    tabSwitch: function (e) {
        var page = this;
        var tab = e.currentTarget.dataset.tab;
        if (tab == "detail") {
            page.setData({
                tab_detail: "active",
                tab_comment: "",
            });
        } else {
            page.setData({
                tab_detail: "",
                tab_comment: "active",
            });
        }
    },
    commentPicView: function (e) {
        var page = this;
        var index = e.currentTarget.dataset.index;
        var pic_index = e.currentTarget.dataset.picIndex;
        wx.previewImage({
            current: page.data.comment_list[index].pic_list[pic_index],
            urls: page.data.comment_list[index].pic_list,
        });
    },
    /**
     * 立即预约
     */
    bespeakNow:function(e){
        var page = this;
        if (!page.data.show_attr_picker) {
            page.setData({
                show_attr_picker: true,
            });
            return true;
        }

        var book_list = [];
        let sentinel = true;
        var list = page.data.attr_group_list;
        for (var i = 0; i < list.length; i++){
            let attr_list = list[i]['attr_list'];
            sentinel = true;
            for(var j = 0; j < attr_list.length; j++){
                if(attr_list[j]['checked']){
                    book_list.push({
                        attr_group_id : list[i]['attr_group_id'],
                        attr_id : attr_list[j]['attr_id'],
                        attr_group_name:list[i]['attr_group_name'],
                        attr_name : attr_list[j]['attr_name']
                    })
                    sentinel = false;
                    continue;
                }
            }
            if(sentinel){
                wx.showModal({
                    title: "提示",
                    content: '请选择' + list[i].attr_group_name,
                    showCancel: false,
                });
                return
            }
        }

        let goods_info = [{
            id: page.data.goods.id,
            attr:book_list
        }]
        wx.redirectTo({
            url: '/pages/book/submit/submit?goods_info=' + JSON.stringify(goods_info),
        })
    },
    
    hideAttrPicker: function() {
        this.setData({
            show_attr_picker: false,
        });
    },

    attrGoodsClick: function (e) {
        var page = this;
        var attr_group_id = e.target.dataset.groupId;
        var attr_id = e.target.dataset.id;
        var attr_group_list = page.data.attr_group_list;

        for (var i in attr_group_list) {
            if (attr_group_list[i].attr_group_id != attr_group_id)
                continue;
            for (var j in attr_group_list[i].attr_list) {
                attr_group_list[i].attr_list[j].checked = attr_group_list[i].attr_list[j].attr_id == attr_id;
            }
        }

         page.setData({
            attr_group_list: attr_group_list,
        });

        let ids = [];
        let sentinel = 0;
        for (var i = 0; i < attr_group_list.length; i++){
            let attr_list = attr_group_list[i]['attr_list'];
            sentinel = 0;

            for(var j = 0; j < attr_list.length; j++){
                if(attr_list[j]['checked']){
                    sentinel = attr_list[j]['attr_id'];
                    continue;
                }
            }
            if(sentinel){
                ids.push(sentinel);
            } else {
                return;  
            }
        }
        
        var goods = page.data.goods;
        goods.attr.forEach(function(item,index,array){
            var attr_list = [];
            item['attr_list'].forEach(function(itema,indexa,arraya){
                attr_list.push(itema['attr_id']);
            });

            if(ids.sort().toString() == attr_list.sort().toString()){
                goods['attr_pic'] = item['pic'];
                goods['stock'] = item['num'];
                goods['price'] = item['price'];
                page.setData({
                    goods:goods
                })
            }
        });
    },
    /**
     * 门店列表
     */
    goToShopList: function (e) {
        wx.navigateTo({
            url: '/pages/book/shop/shop?ids=' + this.data.goods.shop_id,
            success: function(res) {},
            fail: function(res) {},
            complete: function(res) {},
        });
    },
    /**
     * 获取评论列表
     */
    getCommentList: function (more) {
        var page = this;
        if (more && page.data.tab_comment != "active")
            return;
        if (is_loading_comment)
            return;
        if (!is_more_comment)
            return;
        is_loading_comment = true;
        app.request({
            url: api.book.goods_comment,
            data: {
                goods_id: page.data.id,
                page: p,
            },
            success: function (res) {
                if (res.code != 0)
                    return;
                is_loading_comment = false;
                p++;
                page.setData({
                    comment_count: res.data.comment_count,
                    comment_list: more ? page.data.comment_list.concat(res.data.list) : res.data.list,
                });
                if (res.data.list.length == 0)
                    is_more_comment = false;
            }
        });
    },
    showShareModal: function () {
        var page = this;
        page.setData({
            share_modal_active: "active",
            no_scroll: true,
        });
    },

    shareModalClose: function () {
        var page = this;
        page.setData({
            share_modal_active: "",
            no_scroll: false,
        });
    },
    getGoodsQrcode: function () {
        var page = this;
        page.setData({
            goods_qrcode_active: "active",
            share_modal_active: "",
        });
        if (page.data.goods_qrcode)
            return true;
        app.request({
            url: api.book.goods_qrcode,
            data: {
                goods_id: page.data.id,
            },
            success: function (res) {
                if (res.code == 0) {
                    page.setData({
                        goods_qrcode: res.data.pic_url,
                    });
                }
                if (res.code == 1) {
                    page.goodsQrcodeClose();
                    wx.showModal({
                        title: "提示",
                        content: res.msg,
                        showCancel: false,
                        success: function (res) {
                            if (res.confirm) {

                            }
                        }
                    });
                }
            },
        });
    },
    goodsQrcodeClose: function () {
        var page = this;
        page.setData({
            goods_qrcode_active: "",
            no_scroll: false,
        });
    },
    goodsQrcodeClose: function () {
        var page = this;
        page.setData({
            goods_qrcode_active: "",
            no_scroll: false,
        });
    },

    saveGoodsQrcode: function () {
        var page = this;
        if (!wx.saveImageToPhotosAlbum) {
            // 如果希望用户在最新版本的客户端上体验您的小程序，可以这样子提示
            wx.showModal({
                title: '提示',
                content: '当前版本过低，无法使用该功能，请升级到最新版本后重试。',
                showCancel: false,
            });
            return;
        }

        wx.showLoading({
            title: "正在保存图片",
            mask: false,
        });

        wx.downloadFile({
            url: page.data.goods_qrcode,
            success: function (e) {
                wx.showLoading({
                    title: "正在保存图片",
                    mask: false,
                });
                wx.saveImageToPhotosAlbum({
                    filePath: e.tempFilePath,
                    success: function () {
                        wx.showModal({
                            title: '提示',
                            content: '商品海报保存成功',
                            showCancel: false,
                        });
                    },
                    fail: function (e) {
                        wx.showModal({
                            title: '图片保存失败',
                            content: e.errMsg,
                            showCancel: false,
                        });
                    },
                    complete: function (e) {
                        wx.hideLoading();
                    }
                });
            },
            fail: function (e) {
                wx.showModal({
                    title: '图片下载失败',
                    content: e.errMsg + ";" + page.data.goods_qrcode,
                    showCancel: false,
                });
            },
            complete: function (e) {
                wx.hideLoading();
            }
        });

    },

    goodsQrcodeClick: function (e) {
        var src = e.currentTarget.dataset.src;
        wx.previewImage({
            urls: [src],
        });
    },
    goHome:function(e){
        wx.redirectTo({
            url: '/pages/book/index/index',
            success: function(res) {},
            fail: function(res) {},
            complete: function(res) {},
        })
    }
})