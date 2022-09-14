const bcrypt = require("bcrypt")
const userModel = require("../models/users-model")
const userValidator = require("../joi-validators/users")

module.exports = {
  register: async (req, res) => {
    // joi validations for register inputs
    let errorObject = {}

    const userValidationResults = userValidator.registerValidator.validate(
      req.body,
      {
        abortEarly: false,
      }
    )

    if (userValidationResults.error) {
      const validationError = userValidationResults.error.details

      validationError.forEach((error) => {
        errorObject[error.context.key] = error.message
      })

      return res.status(400).json(errorObject)
    }

    let validatedUser = userValidationResults

    try {
      validatedUser = await userModel.findOne({
        email: validatedUser.value.email,
      })

      if (validatedUser) {
        return res.status(409).json({ error: "user exists" })
      }
    } catch (err) {
      return res.status(500).json({ error: "failed to register user" })
    }

    const passHash = await bcrypt.hash(req.body.password, 10)
    const user = { ...req.body, password: passHash }

    try {
      await userModel.create(user)
      res.status(201).json({ success: "user created" })
    } catch (err) {
      res.status(500).json({ error: "failed to register user" })
    }
  },

  login: async (req, res) => {
    // do validations ...
    let errorObject = {}

    const userValidationResults = userValidator.loginValidator.validate(
      req.body,
      {
        abortEarly: false,
      }
    )

    if (userValidationResults.error) {
      const validationError = userValidationResults.error.details

      validationError.forEach((error) => {
        errorObject[error.context.key] = error.message
      })

      return res.status(400).json(errorObject)
    }

    const validatedUser = req.body
    let errMsg = "user email or password is incorrect"
    let user = null

    try {
      user = await userModel.findOne({ email: validatedUser.email })
      if (!user) {
        return res.status(401).json({ error: errMsg })
      }
    } catch (err) {
      return res.status(500).json({ error: "failed to get user" })
    }
   
    const isPasswordOk = await bcrypt.compare(req.body.password, user.passwordgit )

    if (!isPasswordOk) {
      return res.status(401).json({ error: errMsg })
    }

    // generate JWT and return as response
    const userData = {
      fullName: user.fullName,
      preferredName: user.preferredName,
      email: user.email,
    }
    const token = jwt.sign(
      {
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
        data: userData,
      },
      process.env.JWT_SECRET
    )

    return res.json({ token })
  },

  showUser: async (req, res) => {
    let user = null
    let userAuth = res.locals.userAuth

    if (!userAuth) {
      return res.status(401).json({ message: "Not authorised." })
    }

    try {
      user = await userModel.findOne({ email: userAuth.data.email })
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
    } catch (err) {
      return res.status(500).json({ error: "failed to get user" })
    }

    const userData = {
      fullName: user.fullName,
      preferredName: user.preferredName,
      email: user.email,
    }

    return res.json(userData)
  },

  editProfile: async (req, res) => {
    let errorObject = {}

    //validate user values
    const userValidationResults = userValidator.editValidator.validate(
      req.body,
      {
        abortEarly: false,
      }
    )

    //joi validation for edit profile
    if (userValidationResults.error) {
      const validationError = userValidationResults.error.details

      validationError.forEach((error) => {
        errorObject[error.context.key] = error.message
      })

      return res.status(400).json(errorObject)
    }

    let userId = req.params._id
    let user = null

    try {
      user = await userModel.findById(userId)
    } catch (error) {
      return res
        .status(500)
        .json({ error: `Failed to get user of id: ${userId}` })
    }

    if (!user) {
      return res.status(404).json(user)
    }

    try {
      await user.updateOne(req.body)
      res.status(201).json({ message: "profile updated!" })
    } catch (error) {
      res.status(500).json({ error: "failed to update user" })
    }
  },

  deleteUser: async (req, res) => {
    try {
      let userId = req.params._id
      await userModel.findByIdAndDelete(userId)
      res.status(200).json({ message: "Profile deleted" })
    } catch (error) {
      res.status(500).json({ error: "failed to delete user" })
    }
  },
}
